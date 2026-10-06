// Isi HTML email, disalin dari Kode.js. Fungsi murni (mudah dites);
// pengiriman ada di lib/email/graph.ts dan handler job.

export const escHtml = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Port _kirimEmailAkunBaru. `tandaTanganHtml` dari app_config (bukan di repo). */
export function emailAkunBaru(p: {
  namaLengkap: string;
  email: string;
  password: string;
  urlAplikasi: string;
  tandaTanganHtml: string | null;
  adaLogo: boolean;
}): { subject: string; html: string } {
  const e = escHtml;
  const nama = e(p.namaLengkap);
  const html =
    '<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#000;">' +
    `<p>Dear ${nama}</p>` +
    '<p>Below are your login credentials to access the SalesHub:</p>' +
    '<ul>' +
    `<li><b>Email</b> : <a href="mailto:${e(p.email)}">${e(p.email)}</a></li>` +
    `<li><b>Username</b> : ${nama}</li>` +
    `<li><b>Password</b> : ${e(p.password)}</li>` +
    `<li><b>Link SalesHub :</b> <a href="${e(p.urlAplikasi)}">${e(p.urlAplikasi)}</a></li>` +
    '</ul><br>' +
    '<p style="margin:0;"><b>Thanks,<br>Best Regards.</b></p><br>' +
    (p.tandaTanganHtml ?? '') +
    (p.adaLogo ? '<img src="cid:logo_ttd" alt="Nippon Paint" style="display:block;margin-top:8px;border:0;">' : '') +
    '</div>';
  return { subject: `Akun SalesHub - ${p.namaLengkap}`, html };
}
