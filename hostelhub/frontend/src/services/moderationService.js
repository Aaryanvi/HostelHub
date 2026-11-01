import api from "./api";

export async function getReportReasons() {
  const res = await api.get("/moderation/reasons");
  return res.data.reasons;
}

export async function reportListing(productId, reason, details) {
  const res = await api.post(`/moderation/report/${productId}`, { reason, details });
  return res.data;
}

export async function getReports(status = "open") {
  const res = await api.get("/moderation/reports", { params: { status } });
  return res.data.reports;
}

export async function resolveReport(reportId) {
  const res = await api.post(`/moderation/reports/${reportId}/resolve`);
  return res.data;
}

export async function removeListing(productId) {
  const res = await api.delete(`/moderation/products/${productId}`);
  return res.data;
}
