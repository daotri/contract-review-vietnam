'use client';
// Export report as printable HTML — user can print to PDF from browser
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { ContractReview, ClauseAnalysis } from '@/lib/types';

interface ExportButtonProps {
  review: ContractReview;
}

export function ExportButton({ review }: ExportButtonProps) {
  function handleExport() {
    const html = buildReportHtml(review);
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-kiem-tra-hop-dong.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
      <Download className="w-4 h-4" />
      Xuất báo cáo
    </Button>
  );
}

function riskColor(level: string): string {
  switch (level) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#ca8a04';
    case 'low': return '#16a34a';
    default: return '#6b7280';
  }
}

function riskLabel(level: string): string {
  switch (level) {
    case 'critical': return 'Nghiêm trọng';
    case 'high': return 'Cao';
    case 'medium': return 'Trung bình';
    case 'low': return 'Thấp';
    default: return level;
  }
}

function buildClauseRow(clause: ClauseAnalysis): string {
  const color = riskColor(clause.risk_level);
  const issues = clause.issues.map(i => `<li>${i}</li>`).join('');
  const refs = clause.legal_references.map(r => `<li>${r}</li>`).join('');

  return `
    <tr>
      <td style="vertical-align:top;padding:10px;border:1px solid #e5e7eb">${clause.clause_index + 1}</td>
      <td style="vertical-align:top;padding:10px;border:1px solid #e5e7eb;max-width:300px">
        <div style="font-size:13px;white-space:pre-wrap">${clause.clause_text.slice(0, 200)}${clause.clause_text.length > 200 ? '...' : ''}</div>
      </td>
      <td style="vertical-align:top;padding:10px;border:1px solid #e5e7eb;text-align:center">
        <span style="background:${color};color:#fff;padding:2px 10px;border-radius:4px;font-size:12px;font-weight:600">
          ${riskLabel(clause.risk_level)}
        </span>
      </td>
      <td style="vertical-align:top;padding:10px;border:1px solid #e5e7eb">
        ${issues ? `<ul style="margin:0;padding-left:18px;font-size:13px">${issues}</ul>` : '<span style="color:#9ca3af">—</span>'}
      </td>
      <td style="vertical-align:top;padding:10px;border:1px solid #e5e7eb">
        ${clause.suggestion ? `<div style="font-size:13px">${clause.suggestion}</div>` : '<span style="color:#9ca3af">—</span>'}
        ${clause.suggested_text ? `<div style="margin-top:6px;padding:8px;background:#f0fdf4;border-radius:4px;font-size:12px;border:1px solid #bbf7d0"><strong>Văn bản đề xuất:</strong><br/>${clause.suggested_text}</div>` : ''}
      </td>
      <td style="vertical-align:top;padding:10px;border:1px solid #e5e7eb;font-size:12px">
        ${refs ? `<ul style="margin:0;padding-left:18px">${refs}</ul>` : '<span style="color:#9ca3af">—</span>'}
      </td>
    </tr>`;
}

function buildReportHtml(review: ContractReview): string {
  const { risk_summary: rs } = review;
  const now = new Date().toLocaleString('vi-VN', { dateStyle: 'long', timeStyle: 'short' });
  const clauseRows = review.clauses.map(buildClauseRow).join('');

  const missingHtml = review.missing_mandatory_clauses.length > 0
    ? `<div style="margin-top:24px;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px">
        <h3 style="margin:0 0 8px;color:#dc2626;font-size:15px">Điều khoản bắt buộc còn thiếu</h3>
        <ul style="margin:0;padding-left:20px">${review.missing_mandatory_clauses.map(c => `<li>${c}</li>`).join('')}</ul>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <title>Báo cáo kiểm tra hợp đồng</title>
  <style>
    @media print { body { margin: 0; } .no-print { display: none; } }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 1100px; margin: 0 auto; padding: 32px; color: #1f2937; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f9fafb; padding: 10px; border: 1px solid #e5e7eb; text-align: left; font-size: 13px; font-weight: 600; }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="margin:0;font-size:22px">BÁO CÁO KIỂM TRA HỢP ĐỒNG</h1>
    <p style="color:#6b7280;margin:4px 0">Contract AI — ${now}</p>
    <p style="margin:4px 0;font-size:14px">Loại hợp đồng: <strong>${review.contract_type}</strong></p>
  </div>

  <!-- Risk summary -->
  <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap">
    <div style="flex:1;min-width:120px;padding:16px;background:#f9fafb;border-radius:8px;text-align:center;border:1px solid #e5e7eb">
      <div style="font-size:28px;font-weight:700">${rs.total_clauses}</div>
      <div style="font-size:12px;color:#6b7280">Tổng điều khoản</div>
    </div>
    <div style="flex:1;min-width:120px;padding:16px;background:#fef2f2;border-radius:8px;text-align:center;border:1px solid #fecaca">
      <div style="font-size:28px;font-weight:700;color:#dc2626">${rs.critical}</div>
      <div style="font-size:12px;color:#6b7280">Nghiêm trọng</div>
    </div>
    <div style="flex:1;min-width:120px;padding:16px;background:#fff7ed;border-radius:8px;text-align:center;border:1px solid #fed7aa">
      <div style="font-size:28px;font-weight:700;color:#ea580c">${rs.high}</div>
      <div style="font-size:12px;color:#6b7280">Cao</div>
    </div>
    <div style="flex:1;min-width:120px;padding:16px;background:#fefce8;border-radius:8px;text-align:center;border:1px solid #fef08a">
      <div style="font-size:28px;font-weight:700;color:#ca8a04">${rs.medium}</div>
      <div style="font-size:12px;color:#6b7280">Trung bình</div>
    </div>
    <div style="flex:1;min-width:120px;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;border:1px solid #bbf7d0">
      <div style="font-size:28px;font-weight:700;color:#16a34a">${rs.low}</div>
      <div style="font-size:12px;color:#6b7280">Thấp</div>
    </div>
  </div>

  <!-- Overall assessment -->
  <div style="padding:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:24px">
    <h3 style="margin:0 0 8px;font-size:15px">Đánh giá tổng quan</h3>
    <p style="margin:0;font-size:14px">${review.overall_assessment}</p>
  </div>

  ${missingHtml}

  <!-- Clause details -->
  <h2 style="font-size:17px;margin:32px 0 12px">Chi tiết từng điều khoản</h2>
  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th style="width:220px">Nội dung</th>
        <th style="width:100px;text-align:center">Mức rủi ro</th>
        <th>Vấn đề</th>
        <th>Đề xuất</th>
        <th style="width:160px">Căn cứ pháp lý</th>
      </tr>
    </thead>
    <tbody>
      ${clauseRows}
    </tbody>
  </table>

  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px">
    Báo cáo được tạo tự động bởi Contract AI. Vui lòng tham khảo ý kiến luật sư trước khi đưa ra quyết định pháp lý.
  </div>

  <div class="no-print" style="text-align:center;margin-top:24px">
    <button onclick="window.print()" style="padding:10px 24px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px">
      In / Xuất PDF
    </button>
  </div>
</body>
</html>`;
}
