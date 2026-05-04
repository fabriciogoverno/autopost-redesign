export async function GET() {
  const stats = {
    pending: 12,
    published: 156,
    failed: 3,
    rolled_back: 1,
    today: 2,
    week: 18,
    success_rate: 97.5,
    total: 172
  };
  return Response.json(stats);
}
