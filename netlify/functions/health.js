export default async () => {
  return Response.json({
    ok: true,
    service: 'h2-telegram-miniapp-export',
    platform: 'netlify'
  }, {
    headers: { 'Cache-Control': 'no-store' }
  });
};
