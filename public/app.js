
let cart = JSON.parse(localStorage.getItem("maxStyleCart") || "[]");

const cartCount = document.getElementById("cartCount");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartButton = document.getElementById("cartButton");

function updateCart() {
  cartCount.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
  cartItems.innerHTML = "";

  let total = 0;

  if (cart.length === 0) {
    cartItems.textContent = "Your bag is empty.";
  }

  cart.forEach((item, index) => {
    total += item.price * item.qty;

    const div = document.createElement("div");
    const details = document.createElement("p");

    details.textContent = `${item.name} | Size: ${item.size} | Colour: ${item.color} | Rs. ${item.price} × ${item.qty}`;

    const minus = document.createElement("button");
    minus.textContent = "−";
    minus.onclick = () => changeQty(index, -1);

    const plus = document.createElement("button");
    plus.textContent = "+";
    plus.onclick = () => changeQty(index, 1);

    const remove = document.createElement("button");
    remove.textContent = "REMOVE";
    remove.onclick = () => removeItem(index);

    div.append(details, minus, plus, remove);
    cartItems.appendChild(div);
  });

  cartTotal.textContent = total.toLocaleString("en-US");
  localStorage.setItem("maxStyleCart", JSON.stringify(cart));
}

function changeQty(index, amount) {
  cart[index].qty += amount;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  updateCart();
}

function removeItem(index) {
  cart.splice(index, 1);
  updateCart();
}

document.querySelectorAll(".add-cart").forEach(button => {
  button.addEventListener("click", () => {
    const product = button.closest(".product");
    const name = button.dataset.name;
    const price = Number(button.dataset.price);
    const size = product.querySelector(".product-size").value;
    const color = product.querySelector(".product-color").value;

    if (!size || !color) {
      alert("Please select Size and Colour!");
      return;
    }

    const existing = cart.find(item =>
      item.name === name && item.size === size && item.color === color
    );

    if (existing) {
      existing.qty++;
    } else {
      cart.push({ name, price, size, color, qty: 1 });
    }

    updateCart();
    alert("Added to Bag successfully!");
  });
});

cartButton.addEventListener("click", () => {
  document.getElementById("cart").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("orderForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (cart.length === 0) {
    alert("Your bag is empty!");
    return;
  }

  const orderMessage = document.getElementById("orderMessage");
  const submitButton = event.target.querySelector('button[type="submit"]');

  const order = {
    customerName: document.getElementById("customerName").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    address: document.getElementById("address").value.trim(),
    items: cart,
    total: cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  };

  submitButton.disabled = true;
  orderMessage.textContent = "Sending your order...";

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

    orderMessage.textContent = "Your order has been received. Thank you!";
    cart = [];
    updateCart();
    event.target.reset();

  } catch (error) {
    orderMessage.textContent = "Order could not be submitted. Please try again.";
  } finally {
    submitButton.disabled = false;
  }
});

updateCart();
