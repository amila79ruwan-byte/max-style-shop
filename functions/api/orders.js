
export async function onRequestPost({ request, env }) {
  try {
    const order = await request.json();

    if (!order.customerName || !order.phone || !order.address) {
      return Response.json(
        { success: false, message: "Missing customer details" },
        { status: 400 }
      );
    }

    await env.DB.prepare(
      `INSERT INTO orders (customer_name, phone, address, items, total)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      order.customerName,
      order.phone,
      order.address,
      JSON.stringify(order.items || []),
      Number(order.total || 0)
    ).run();

    return Response.json({ success: true, message: "Order received" });
  } catch (error) {
    return Response.json(
      { success: false, message: "Could not save order" },
      { status: 500 }
    );
  }
}
