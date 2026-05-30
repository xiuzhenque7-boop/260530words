export default async function handler(req: any, res: any) {
  try {
    const { default: app } = await import("../server-app");
    return app(req, res);
  } catch (err: any) {
    console.error("Vercel Serverless Function Crash:", err);
    res.status(500).json({
      error: "Vercel Serverless Function Startup Error",
      message: err?.message || String(err),
      stack: err?.stack || null
    });
  }
}
