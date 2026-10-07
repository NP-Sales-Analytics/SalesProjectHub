// Kirim email lewat Microsoft Graph sendMail (client credentials), tanpa SDK.
// Pengganti kirimEmailOutlook di Kode.js. Bedanya: GAGAL = melempar error, sehingga
// job email benar-benar diulang (sistem lama menganggap email gagal sudah terkirim).

export type Lampiran = { nama: string; tipe: string; base64: string; cid?: string };
export type Email = {
  to: string[];
  cc?: string[];
  replyTo?: string;
  subject: string;
  html: string;
  lampiran?: Lampiran[];
};

const NAMA_PENGIRIM = 'Sales Support Project';
let token: { nilai: string; kedaluwarsa: number } | null = null;

function env(nama: string) {
  const v = process.env[nama];
  if (!v) throw new Error(`${nama} belum diset`);
  return v;
}

async function ambilToken(): Promise<string> {
  if (token && token.kedaluwarsa > Date.now()) return token.nilai;
  const res = await fetch(`https://login.microsoftonline.com/${env('MS_TENANT_ID')}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('MS_CLIENT_ID'),
      client_secret: env('MS_CLIENT_SECRET'),
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!res.ok || !json.access_token) throw new Error(`Gagal mengambil token Graph (HTTP ${res.status})`);
  // Disimpan sampai 5 menit sebelum kedaluwarsa, sama seperti sistem lama.
  token = { nilai: json.access_token, kedaluwarsa: Date.now() + ((json.expires_in ?? 3600) - 300) * 1000 };
  return token.nilai;
}

const alamat = (daftar: string[]) => daftar.map((address) => ({ emailAddress: { address } }));

/** Bersihkan & dedup daftar email (tak peka huruf besar), buang yang ada di `kecuali`. */
export function rapikanEmail(daftar: (string | null | undefined)[], kecuali: string[] = []): string[] {
  const buang = new Set(kecuali.map((e) => e.toLowerCase()));
  const hasil = new Map<string, string>();
  for (const isi of daftar) {
    for (const e of String(isi ?? '').split(/[,;]+/)) {
      const v = e.trim();
      if (v && !buang.has(v.toLowerCase()) && !hasil.has(v.toLowerCase())) hasil.set(v.toLowerCase(), v);
    }
  }
  return [...hasil.values()];
}

export async function kirimEmail(email: Email): Promise<void> {
  if (!email.to.length) throw new Error('Penerima email (to) kosong.');
  const pengirim = env('MS_SENDER_MAILBOX');

  const message: Record<string, unknown> = {
    subject: email.subject,
    body: { contentType: 'HTML', content: email.html },
    from: { emailAddress: { address: pengirim, name: NAMA_PENGIRIM } },
    toRecipients: alamat(email.to),
  };
  if (email.cc?.length) message.ccRecipients = alamat(email.cc);
  if (email.replyTo) message.replyTo = [{ emailAddress: { address: email.replyTo, name: NAMA_PENGIRIM } }];
  if (email.lampiran?.length) {
    message.attachments = email.lampiran.map((l) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: l.nama,
      contentType: l.tipe,
      contentBytes: l.base64,
      ...(l.cid ? { isInline: true, contentId: l.cid } : {}),
    }));
  }

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(pengirim)}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await ambilToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });
  if (res.status === 401) token = null; // token kedaluwarsa di tengah jalan → ambil ulang di percobaan berikutnya
  // Graph sendMail sukses = HTTP 202.
  if (res.status !== 202) throw new Error(`Graph sendMail HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
}
