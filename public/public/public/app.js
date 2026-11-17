
let cart = [];

const cartCount = document.getElementById("cartCount");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const orderForm = document.getElementById("orderForm");

function saveCart() {
  localStorage.setItem("maxStyleCart", JSON.stringify(cart));
}

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("maxStyleCart") || "[]");
    cart = Array.isArray(saved) ? saved.filter(item =>
      item &&
      typeof item.name === "string" &&
      Number.isFinite(Number(item.price)) &&
      Number(item.price) > 0 &&
      Number.isInteger(Number(item.quantity)) &&
      Number(item.quantity) > 0
    ) : [];
  } catch {
    cart = [];
  }
}

function formatPrice(price) {
  return Number(price).toLocaleString("en-LK");
}

function updateCart() {
  cartCount.textContent = cart.reduce(
    (sum, item) => sum + item.quantity, 0
  );

  cartItems.innerHTML = "";

  if (cart.length === 0) {
    cartItems.textContent = "Your bag is empty.";
  }

  let total = 0;

  cart.forEach((item, index) => {
    const subtotal = item.price * item.quantity;
    total += subtotal;

    const div = document.createElement("div");
    div.className = "cart-item";

    const name = document.createElement("strong");
    name.textContent = item.name;

    const price = document.createElement("p");
    price.textContent = "Rs. " + formatPrice(subtotal);

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    minus.onclick = () => changeQuantity(index, -1);

    const quantity = document.createElement("span");
    quantity.textContent = " " + item.quantity + " ";

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.onclick = () => changeQuantity(index, 1);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.onclick = () => removeItem(index);

    div.append(name, price, minus, quantity, plus, remove);
    cartItems.appendChild(div);
  });

  cartTotal.textContent = formatPrice(total);
  saveCart();
}

function changeQuantity(index, amount) {
  if (!cart[index]) return;

  cart[index].quantity += amount;

  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }

  updateCart();
}

function removeItem(index) {
  cart.splice(index, 1);
  updateCart();
}

document.querySelectorAll(".add-cart").forEach(button => {
  button.addEventListener("click", () => {
    const name = button.dataset.name;
    const price = Number(button.dataset.price);

    if (!name || !Number.isFinite(price) || price <= 0) {
      alert("Product information is invalid.");
      return;
    }

    const existing = cart.find(item => item.name === name);

    if (existing) {
      existing.quantity++;
    } else {
      cart.push({
        name: name,
        price: price,
        quantity: 1
      });
    }

    updateCart();
    alert(name + " added to your bag!");
  });
});

document.getElementById("cartButton").addEventListener("click", () => {
  document.getElementById("cart").scrollIntoView({
    behavior: "smooth"
  });
});

orderForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (cart.length === 0) {
    alert("Please add products to your bag first.");
    return;
  }

  const order = {
    customerName: document.getElementById("customerName").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    address: document.getElementById("address").value.trim(),
    items: cart.map(item => ({ ...item })),
    total: cart.reduce(
      (sum, item) => sum + item.price * item.quantity, 0
    )
  };

  if (!order.customerName || !order.phone || !order.address) {
    alert("Please complete all delivery details.");
    return;
  }

  const message = document.getElementById("orderMessage");
  const submitButton = orderForm.querySelector("button[type='submit']");

  submitButton.disabled = true;
  submitButton.textContent = "SENDING...";

  message.textContent = "";

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Order failed");
    }

    message.textContent = "Thank you! Your order has been received.";

    cart = [];
    updateCart();
    orderForm.reset();

  } catch (error) {
    message.textContent =
      "Order could not be submitted. Please try again.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "PLACE MY ORDER →";
  }
});

loadCart();
updateCart();
