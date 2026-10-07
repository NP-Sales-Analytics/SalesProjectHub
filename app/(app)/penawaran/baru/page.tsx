import { FormPenawaran, type AwalForm } from '@/components/penawaran/form-penawaran';
import { requireHalaman } from '@/lib/auth';
import { masterAkses } from '@/lib/master';
import { masterPenawaran } from '@/lib/penawaran/master';
import { detailPenawaran, GalatPenawaran, perluTindakanAdmin } from '@/lib/penawaran/service';

export const dynamic = 'force-dynamic';

export default async function BuatPenawaranPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const user = await requireHalaman('/penawaran/baru');
  const admin = user.role === 'super admin' || user.role === 'admin';
  const [m, ma, { edit }] = await Promise.all([masterPenawaran(), masterAkses(), searchParams]);

  // Sales hanya melihat penugasannya sendiri; role lain semua pasangan di master.
  const penugasan = user.role === 'sales'
    ? user.akses.penugasan
    : ma.salesOrganisasi.map((s) => ({ organisasi: s.organisasi, namaSales: s.namaSales }));

  let awal: AwalForm | null = null;
  let galatEdit: string | null = null;
  if (edit && admin) {
    try {
      const p = await detailPenawaran(user, edit);
      awal = {
        id: p.id, nomor: p.nomor, status: p.status, catatanApproval: p.catatanApproval,
        organisasi: p.organisasi ?? '', namaSales: p.namaSales ?? '', area: p.area ?? '', kam: p.kam ?? '',
        franco: p.franco ?? '', perusahaan: p.perusahaan ?? '', pic: p.pic ?? '', telepon: p.telepon ?? '',
        email: p.email ?? '', namaProyek: p.namaProyek ?? '', alamat: p.alamat ?? '',
        produk: p.produk.map((it) => ({
          jenisProduk: it.jenisProduk ?? '', tier: it.tier ?? '', namaProduk: it.namaProduk ?? '', jenisRm: it.jenisRm ?? '',
          warna: it.warna ?? '', kemasan: it.kemasan ?? '', kodeWarna: it.kodeWarna ?? '', catatanAdmin: it.catatanAdmin ?? '',
          harga: Number(it.hargaEdit || it.hargaSatuan || 0),
        })),
      };
    } catch (err) {
      if (!(err instanceof GalatPenawaran)) throw err;
      galatEdit = err.message;
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <FormPenawaran
        key={awal?.id ?? 'baru'}
        master={{
          organisasi: [...new Set(penugasan.map((p) => p.organisasi))].sort(),
          penugasan,
          area: m.area.map((a) => a.nama),
          kam: m.kam.map((k) => k.nama),
          produk: m.produk.map(({ nama, jenisRm, warna, kemasan, fp1, fp2, fp3, fp4 }) => ({ nama, jenisRm, warna, kemasan, fp1, fp2, fp3, fp4 })),
        }}
        awal={awal}
        galatEdit={galatEdit}
        perluTindakan={admin ? (await perluTindakanAdmin(user)).map((p) => ({
          id: p.id!, nomor: p.nomor!, status: p.status!, tanggal: String(p.tanggal), perusahaan: p.perusahaan, namaProyek: p.namaProyek,
          catatanApproval: p.catatanApproval,
        })) : null}
      />
    </div>
  );
}
