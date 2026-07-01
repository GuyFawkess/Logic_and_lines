export { renderers } from '../../renderers.mjs';

const POST = async ({ request }) => {
  {
    return new Response(
      JSON.stringify({ error: "Meta CAPI credentials not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
