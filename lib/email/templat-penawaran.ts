// Template HTML email penawaran — DISALIN APA ADANYA dari Kode.js lama
// (kirimEmailApproval & _kirimEmailKonfirmasiApproval) oleh skrip ekstraksi.
// Bedanya hanya: semua nilai masukan di-escape lebih dulu (lib/email/templat.ts).
// Jangan diubah manual kecuali memang ingin mengubah tampilan email.
/* eslint-disable */

export type DataEmailPenawaran = {
  organisasi: string; kam: string; nama_sales: string; sales: string; area: string; franco: string;
  perusahaan: string; pic: string; project: string; alamat: string; tanggal: string;
};
export type ProdukEmail = { nama_produk: string; jenis_rm: string; kemasan: string; tier: string; harga: number };

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
/** Port _formatTanggalPendek: "dd Mmm yyyy" (bulan Indonesia). Masukan tanggal ISO yyyy-mm-dd. */
export function formatTanggalPendek(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return iso || '-';
  return m[3] + ' ' + BULAN[Number(m[2]) - 1] + ' ' + m[1];
}

export function barisProdukApproval(produkList: ProdukEmail[]): string {
  return produkList.map(function (p, idx) {
    var isEven = (idx % 2 === 1);
    var bgTd = isEven ? '#f8fafc' : '#ffffff';
    var borderStyle = (idx === produkList.length - 1) ? '' : 'border-bottom:1px solid #e2e8f0;';
    var namaProduk = p.nama_produk || '-';
    var jenisMixKemasan = [p.jenis_rm, p.kemasan].filter(Boolean).join(' / ') || '-';
    var fpTier = p.tier || '-';
    var hargaFormatted = 'Rp ' + Number(p.harga || 0).toLocaleString('id-ID');
    return `
        <tr>
          <td style="padding:9px 10px;${borderStyle}background-color:${bgTd};">
            <p style="margin:0; line-height:16px; color:#94a3b8; font-weight:bold; text-align:center; mso-line-height-rule:exactly;">${idx + 1}</p>
          </td>
          <td style="padding:9px 10px;${borderStyle}background-color:${bgTd};">
            <p style="margin:0; line-height:16px; color:#0f172a; font-weight:bold; mso-line-height-rule:exactly;">${namaProduk}</p>
          </td>
          <td style="padding:9px 10px;${borderStyle}background-color:${bgTd};">
            <p style="margin:0; line-height:16px; color:#64748b; mso-line-height-rule:exactly;">${jenisMixKemasan}</p>
          </td>
          <td style="padding:9px 10px;${borderStyle}background-color:${bgTd};text-align:center;">
            <span style="background-color:#059669;color:#ffffff;padding:4px 6px;border-radius:4px;font-weight:bold;font-size:10px;">${fpTier}</span>
          </td>
          <td style="padding:9px 10px;${borderStyle}background-color:${bgTd};text-align:right;">
            <p style="margin:0; line-height:16px; color:#059669; font-weight:bold; mso-line-height-rule:exactly;">${hargaFormatted}</p>
          </td>
        </tr>`;
  }).join('');
}

export function htmlEmailApproval(id: string, tanggal: string, dearName: string, formData: DataEmailPenawaran, produkRowsHtml: string): string {
  return `<!DOCTYPE html><html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <!--[if mso]>
        <style type="text/css">
          table {border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;}
          table, td, p, h1, span, a {font-family: Arial, sans-serif !important;}
          td, p, span { mso-line-height-rule: exactly; }
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f7f6;">
          <tr>
            <td align="center" style="padding: 32px 10px;">
              
              <!--[if (gte mso 9)|(IE)]>
              <table align="center" cellpadding="0" cellspacing="0" border="0" width="600"><tr><td align="center" valign="top">
              <![endif]-->

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto; width: 100%;">
                
                <!-- Header -->
                <tr>
                  <td style="background-color: #059669; padding: 24px; text-align: left; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: bold; font-family: Arial, sans-serif; line-height: 24px; mso-line-height-rule: exactly;">Permintaan Persetujuan</h1>
                    <p style="margin: 6px 0 0 0; color: #d1fae5; font-size: 13px; font-family: Arial, sans-serif; line-height: 16px; mso-line-height-rule: exactly;">${id} &nbsp;|&nbsp; ${tanggal}</p>
                  </td>
                </tr>

                <!-- Body Content -->
                <tr>
                  <td style="padding: 24px; text-align: left;">
                    ${dearName ? `
                    <p style="margin: 0 0 4px 0; font-size: 14px; color: #0f172a; font-weight: bold; line-height: 20px; font-family: Arial, sans-serif; mso-line-height-rule: exactly;">
                      Dear ${dearName}
                    </p>
                    ` : ''}
                    <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 20px; font-family: Arial, sans-serif; mso-line-height-rule: exactly;">
                      Berikut adalah detail penawaran yang memerlukan persetujuan Anda:
                    </p>

                    <!-- Subtitle: Profil Sales -->
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #0f172a; font-family: Arial, sans-serif; font-weight: bold; line-height: 18px; mso-line-height-rule: exactly;">
                      Profil Sales
                    </p>

                    <!-- Profil Sales Table -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 6px; font-family: Arial, sans-serif; font-size: 13px; margin-bottom: 24px;">
                      <tr>
                        <td width="38%" style="background-color:#f8fafc;padding:9px 14px;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0; line-height:16px; color:#64748b; font-weight:bold; font-size:11px; text-transform:uppercase; mso-line-height-rule:exactly;">No. Penawaran</p>
                        </td>
                        <td width="62%" style="background-color:#f8fafc;padding:9px 14px;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0; line-height:18px; color:#0f172a; font-weight:bold; mso-line-height-rule:exactly;">${id}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:9px 14px;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0; line-height:16px; color:#64748b; font-size:11px; text-transform:uppercase; mso-line-height-rule:exactly;">Tanggal</p>
                        </td>
                        <td style="padding:9px 14px;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0; line-height:18px; color:#0f172a; mso-line-height-rule:exactly;">${tanggal}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background-color:#f8fafc;padding:9px 14px;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0; line-height:16px; color:#64748b; font-size:11px; text-transform:uppercase; mso-line-height-rule:exactly;">Sales</p>
                        </td>
                        <td style="background-color:#f8fafc;padding:9px 14px;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0; line-height:18px; color:#0f172a; font-weight:bold; mso-line-height-rule:exactly;">${formData.nama_sales || '-'}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:9px 14px;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0; line-height:16px; color:#64748b; font-size:11px; text-transform:uppercase; mso-line-height-rule:exactly;">Organisasi</p>
                        </td>
                        <td style="padding:9px 14px;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0; line-height:18px; color:#0f172a; mso-line-height-rule:exactly;">${formData.organisasi || '-'}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background-color:#f8fafc;padding:9px 14px;">
                          <p style="margin:0; line-height:16px; color:#64748b; font-size:11px; text-transform:uppercase; mso-line-height-rule:exactly;">Key Account Manager</p>
                        </td>
                        <td style="background-color:#f8fafc;padding:9px 14px;">
                          <p style="margin:0; line-height:18px; color:#0f172a; mso-line-height-rule:exactly;">${formData.kam || '-'}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Subtitle: Data Client -->
                    <p style="margin: 24px 0 10px 0; font-size: 14px; color: #0f172a; font-family: Arial, sans-serif; font-weight: bold; line-height: 18px; mso-line-height-rule: exactly;">
                      Data Client
                    </p>

                    <!-- Data Client Table -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 6px; font-family: Arial, sans-serif; font-size: 13px;">
                      <tr>
                        <td width="38%" style="background-color:#f8fafc;padding:9px 14px;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0; line-height:16px; color:#64748b; font-weight:bold; font-size:11px; text-transform:uppercase; mso-line-height-rule:exactly;">Nama Proyek</p>
                        </td>
                        <td width="62%" style="background-color:#f8fafc;padding:9px 14px;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0; line-height:18px; color:#0f172a; font-weight:bold; mso-line-height-rule:exactly;">${formData.project || '-'}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:9px 14px;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0; line-height:16px; color:#64748b; font-size:11px; text-transform:uppercase; mso-line-height-rule:exactly;">Perusahaan</p>
                        </td>
                        <td style="padding:9px 14px;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0; line-height:18px; color:#0f172a; mso-line-height-rule:exactly;">${formData.perusahaan || '-'}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background-color:#f8fafc;padding:9px 14px;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0; line-height:16px; color:#64748b; font-size:11px; text-transform:uppercase; mso-line-height-rule:exactly;">PIC</p>
                        </td>
                        <td style="background-color:#f8fafc;padding:9px 14px;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0; line-height:18px; color:#0f172a; mso-line-height-rule:exactly;">${formData.pic || '-'}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:9px 14px;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0; line-height:16px; color:#64748b; font-size:11px; text-transform:uppercase; mso-line-height-rule:exactly;">Alamat Proyek</p>
                        </td>
                        <td style="padding:9px 14px;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0; line-height:18px; color:#0f172a; mso-line-height-rule:exactly;">${formData.alamat || '-'}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background-color:#f8fafc;padding:9px 14px;">
                          <p style="margin:0; line-height:16px; color:#64748b; font-size:11px; text-transform:uppercase; mso-line-height-rule:exactly;">Area / Franco</p>
                        </td>
                        <td style="background-color:#f8fafc;padding:9px 14px;">
                          <p style="margin:0; line-height:18px; color:#0f172a; mso-line-height-rule:exactly;">${formData.area || '-'} / ${formData.franco || '-'}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Spacer 24px -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:24px; line-height:24px; mso-line-height-rule:exactly;">&nbsp;</td>
                      </tr>
                    </table>

                    <!-- Ringkasan Produk & FP Tier -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #059669; border-radius: 6px; font-family: Arial, sans-serif; font-size: 11px;">
                      <tr>
                        <td colspan="5" style="background-color: #059669; padding: 12px 14px;">
                          <p style="margin:0; line-height:15px; color:#ffffff; font-weight:bold; font-size:12px; text-transform:uppercase; mso-line-height-rule:exactly;">📦 Ringkasan Produk & FP Tier</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="5%" style="padding:9px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">
                          <p style="margin:0; line-height:14px; color:#059669; font-weight:bold; mso-line-height-rule:exactly;">NO</p>
                        </td>
                        <td width="35%" style="padding:9px 10px;border-bottom:1px solid #e2e8f0;text-align:left;">
                          <p style="margin:0; line-height:14px; color:#059669; font-weight:bold; mso-line-height-rule:exactly;">NAMA PRODUK</p>
                        </td>
                        <td width="30%" style="padding:9px 10px;border-bottom:1px solid #e2e8f0;text-align:left;">
                          <p style="margin:0; line-height:14px; color:#059669; font-weight:bold; mso-line-height-rule:exactly;">JENIS MIX / KEMASAN</p>
                        </td>
                        <td width="10%" style="padding:9px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">
                          <p style="margin:0; line-height:14px; color:#059669; font-weight:bold; mso-line-height-rule:exactly;">FP TIER</p>
                        </td>
                        <td width="20%" style="padding:9px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">
                          <p style="margin:0; line-height:14px; color:#059669; font-weight:bold; mso-line-height-rule:exactly;">HARGA SATUAN</p>
                        </td>
                      </tr>
                      ${produkRowsHtml}
                    </table>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="middle" style="text-align: left;">
                          <p style="margin: 0; font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; color: #0f172a; line-height: 16px; mso-line-height-rule: exactly;">PT. NIPSEA PAINT AND CHEMICAL</p>
                          <p style="margin: 2px 0 0 0; font-family: Arial, sans-serif; font-size: 11px; color: #94a3b8; line-height: 14px; mso-line-height-rule: exactly;">SalesHub — Sistem Manajemen Penawaran</p>
                        </td>
                        <td valign="middle" style="text-align: right;">
                          <p style="margin: 0; font-family: Arial, sans-serif; font-size: 10px; color: #cbd5e1; line-height: 13px; mso-line-height-rule: exactly;">Email otomatis — jangan dibalas</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>

              <!--[if (gte mso 9)|(IE)]>
              </td></tr></table>
              <![endif]-->

            </td>
          </tr>
        </table>
      </body>
      </html>
      `;
}

export type TemaKonfirmasi = {
  accent: string; headerBg: string; badgeBg: string; badgeBorder: string; statusColor: string;
  attachmentNote: string; headerText: string; icon: string; pesanSingkat: string;
};

export function htmlEmailKonfirmasi(id: string, formData: DataEmailPenawaran, statusLabel: string, theme: TemaKonfirmasi,
  alasan: string, approverName: string): string {
  return `<!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <!--[if mso]>
          <noscript>
            <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
          </noscript>
          <style type="text/css">
            table {border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;}
            table, td, p, h1, span, a, strong {font-family: Arial, Helvetica, sans-serif !important;}
            p, td, span {mso-line-height-rule: exactly;}
          </style>
          <![endif]-->
        </head>
        <body style="margin:0; padding:0; background-color:#f4f7f6; font-family: Arial, Helvetica, sans-serif;">

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f7f6;">
            <tr>
              <td align="center" style="padding:32px 10px; mso-line-height-rule:exactly;">

                <!--[if (gte mso 9)|(IE)]>
                <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="600"><tr><td align="center" valign="top">
                <![endif]-->

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border:1px solid #e2e8f0; max-width:600px; margin:0 auto;">

                  <!-- Top Accent Bar -->
                  <tr>
                    <td bgcolor="${theme.accent}" style="background-color:${theme.accent}; height:4px; font-size:0; line-height:0; mso-line-height-rule:exactly;">&nbsp;</td>
                  </tr>

                  <!-- Header -->
                  <tr>
                    <td bgcolor="${theme.headerBg}" style="background-color:${theme.headerBg}; padding:24px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="font-family: Arial, Helvetica, sans-serif; font-size:20px; line-height:24px; font-weight:bold; color:${theme.headerText}; mso-line-height-rule:exactly;">Penawaran ${statusLabel}</td>
                        </tr>
                        <tr>
                          <td style="padding-top:4px; font-family: Arial, Helvetica, sans-serif; font-size:12px; line-height:16px; color:#e2e8f0; mso-line-height-rule:exactly;">${id} &nbsp;|&nbsp; ${formatTanggalPendek(formData.tanggal)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Body Content -->
                  <tr>
                    <td style="padding:32px; text-align:left;">

                      <!-- Greeting -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="padding-bottom:6px; font-family: Arial, Helvetica, sans-serif; font-size:14px; line-height:18px; color:#1e293b; mso-line-height-rule:exactly;">Dear  <strong>${formData.sales || 'Sales'}</strong>,</td>
                        </tr>
                        <tr>
                          <td style="font-family: Arial, Helvetica, sans-serif; font-size:13px; line-height:20px; color:#64748b; mso-line-height-rule:exactly;">Berikut adalah hasil review penawaran yang telah Anda ajukan.</td>
                        </tr>
                      </table>

                      <!-- Spacer -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr><td height="20" style="font-size:0; line-height:20px; mso-line-height-rule:exactly;">&nbsp;</td></tr>
                      </table>

                      <!-- Status Badge -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${theme.badgeBg}; border:1px solid ${theme.badgeBorder}; border-left:4px solid ${theme.accent};">
                        <tr>
                          <td bgcolor="${theme.badgeBg}" style="background-color:${theme.badgeBg}; padding:16px 20px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="padding-bottom:2px; font-family: Arial, Helvetica, sans-serif; font-size:10px; line-height:14px; font-weight:bold; color:${theme.accent}; text-transform:uppercase; letter-spacing:1px; mso-line-height-rule:exactly;">Status Penawaran</td>
                              </tr>
                              <tr>
                                <td style="font-family: Arial, Helvetica, sans-serif; font-size:18px; line-height:22px; font-weight:bold; color:${theme.accent}; mso-line-height-rule:exactly;">${statusLabel}</td>
                              </tr>
                              ${alasan ? `
                              <tr>
                                <td style="padding-top:12px;">
                                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr><td height="1" bgcolor="${theme.badgeBorder}" style="background-color:${theme.badgeBorder}; font-size:0; line-height:1px; mso-line-height-rule:exactly;">&nbsp;</td></tr>
                                  </table>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding-top:12px; padding-bottom:2px; font-family: Arial, Helvetica, sans-serif; font-size:10px; line-height:14px; font-weight:bold; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; mso-line-height-rule:exactly;">Catatan dari Approver</td>
                              </tr>
                              <tr>
                                <td style="font-family: Arial, Helvetica, sans-serif; font-size:13px; line-height:20px; color:#374151; mso-line-height-rule:exactly;">${alasan}</td>
                              </tr>
                              ` : ''}
                              <tr>
                                <td style="padding-top:12px; font-family: Arial, Helvetica, sans-serif; font-size:11px; line-height:14px; color:#94a3b8; mso-line-height-rule:exactly;">Diproses oleh: <strong style="color:#64748b;">${approverName || 'Management'}</strong></td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- Spacer -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr><td height="20" style="font-size:0; line-height:20px; mso-line-height-rule:exactly;">&nbsp;</td></tr>
                      </table>

                      <!-- Detail Penawaran Subtitle -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="padding-bottom:10px; font-family: Arial, Helvetica, sans-serif; font-size:14px; line-height:18px; color:#0f172a; font-weight:bold; mso-line-height-rule:exactly;">Detail Penawaran</td>
                        </tr>
                      </table>

                      <!-- Detail Penawaran Table -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0; font-family: Arial, Helvetica, sans-serif; font-size:13px;">
                        <tr>
                          <td width="38%" bgcolor="#f8fafc" style="background-color:#f8fafc; padding:9px 14px; border-bottom:1px solid #e2e8f0;">
                            <p style="margin:0; line-height:16px; color:#64748b; font-weight:bold; font-size:11px; text-transform:uppercase; mso-line-height-rule:exactly;">No. Penawaran</p>
                          </td>
                          <td width="62%" bgcolor="#f8fafc" style="background-color:#f8fafc; padding:9px 14px; border-bottom:1px solid #e2e8f0;">
                            <p style="margin:0; line-height:18px; color:#0f172a; font-weight:bold; mso-line-height-rule:exactly;">${id}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:9px 14px; border-bottom:1px solid #e2e8f0;">
                            <p style="margin:0; line-height:16px; color:#64748b; font-size:11px; text-transform:uppercase; mso-line-height-rule:exactly;">Nama Proyek</p>
                          </td>
                          <td style="padding:9px 14px; border-bottom:1px solid #e2e8f0;">
                            <p style="margin:0; line-height:18px; color:#0f172a; mso-line-height-rule:exactly;">${formData.project || '-'}</p>
                          </td>
                        </tr>
                        <tr>
                          <td bgcolor="#f8fafc" style="background-color:#f8fafc; padding:9px 14px; border-bottom:1px solid #e2e8f0;">
                            <p style="margin:0; line-height:16px; color:#64748b; font-size:11px; text-transform:uppercase; mso-line-height-rule:exactly;">Perusahaan</p>
                          </td>
                          <td bgcolor="#f8fafc" style="background-color:#f8fafc; padding:9px 14px; border-bottom:1px solid #e2e8f0;">
                            <p style="margin:0; line-height:18px; color:#0f172a; mso-line-height-rule:exactly;">${formData.perusahaan || '-'}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:9px 14px;">
                            <p style="margin:0; line-height:16px; color:#64748b; font-size:11px; text-transform:uppercase; mso-line-height-rule:exactly;">Area / Franco</p>
                          </td>
                          <td style="padding:9px 14px;">
                            <p style="margin:0; line-height:18px; color:#0f172a; mso-line-height-rule:exactly;">${formData.area || '-'} / ${formData.franco || '-'}</p>
                          </td>
                        </tr>
                      </table>

                      <!-- Spacer -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr><td height="20" style="font-size:0; line-height:20px; mso-line-height-rule:exactly;">&nbsp;</td></tr>
                      </table>

                      <!-- Pesan Penutup -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${theme.badgeBg};">
                        <tr>
                          <td bgcolor="${theme.badgeBg}" style="background-color:${theme.badgeBg}; padding:12px 14px;">
                            <p style="margin:0; font-family: Arial, Helvetica, sans-serif; font-size:13px; line-height:18px; color:${theme.statusColor}; mso-line-height-rule:exactly;">${theme.pesanSingkat}</p>
                          </td>
                        </tr>
                      </table>

                      <!-- Spacer -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr><td height="16" style="font-size:0; line-height:16px; mso-line-height-rule:exactly;">&nbsp;</td></tr>
                      </table>

                      <!-- Attachment Note -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size:12px; line-height:16px; color:#94a3b8; font-style:italic; mso-line-height-rule:exactly;">${theme.attachmentNote}</td>
                        </tr>
                      </table>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td bgcolor="#f8fafc" style="background-color:#f8fafc; padding:20px 32px; border-top:1px solid #e2e8f0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td valign="middle" align="left" style="text-align:left;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="font-family: Arial, Helvetica, sans-serif; font-size:12px; line-height:16px; font-weight:bold; color:#0f172a; mso-line-height-rule:exactly;">PT. NIPSEA PAINT AND CHEMICAL</td>
                              </tr>
                              <tr>
                                <td style="padding-top:2px; font-family: Arial, Helvetica, sans-serif; font-size:11px; line-height:14px; color:#94a3b8; mso-line-height-rule:exactly;">SalesHub &mdash; Sistem Manajemen Penawaran</td>
                              </tr>
                            </table>
                          </td>
                          <td valign="middle" align="right" style="text-align:right;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="font-family: Arial, Helvetica, sans-serif; font-size:10px; line-height:14px; color:#cbd5e1; mso-line-height-rule:exactly;">Email otomatis &mdash; jangan dibalas</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Bottom Accent Bar -->
                  <tr>
                    <td bgcolor="${theme.accent}" style="background-color:${theme.accent}; height:4px; font-size:0; line-height:0; mso-line-height-rule:exactly;">&nbsp;</td>
                  </tr>

                </table>

                <!--[if (gte mso 9)|(IE)]>
                </td></tr></table>
                <![endif]-->

              </td>
            </tr>
          </table>
        </body>
        </html>
        `;
}
