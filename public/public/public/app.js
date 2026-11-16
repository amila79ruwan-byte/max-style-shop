
let cart = [];

const cartCount = document.getElementById("cartCount");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");

function updateCart() {
  cartCount.textContent = cart.reduce(
    (sum, item) => sum + item.quantity, 0
  );

  cartItems.innerHTML = "";

  if (cart.length === 0) {
    cartItems.textContent = "Your cart is empty.";
  }

  let total = 0;

  cart.forEach((item, index) => {
    total += item.price * item.quantity;

    const div = document.createElement("div");
    div.textContent =
      `${item.name} × ${item.quantity} — Rs. ${item.price * item.quantity} `;

    const remove = document.createElement("button");
    remove.textContent = "Remove";
    remove.onclick = () => {
      cart.splice(index, 1);
      updateCart();
    };

    div.appendChild(remove);
    cartItems.appendChild(div);
  });

  cartTotal.textContent = total.toLocaleString("en-LK");
}

document.querySelectorAll(".add-cart").forEach(button => {
  button.addEventListener("click", () => {
    const name = button.dataset.name;
    const price = Number(button.dataset.price);

    const existing = cart.find(item => item.name === name);

    if (existing) {
      existing.quantity++;
    } else {
      cart.push({ name, price, quantity: 1 });
    }

    updateCart();
    alert(name + " added to cart!");
  });
});

document.getElementById("cartButton").addEventListener("click", () => {
  document.getElementById("cart").scrollIntoView({
    behavior: "smooth"
  });
});

document.getElementById("orderForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (cart.length === 0) {
    alert("Please add products to your cart first.");
    return;
  }

  const order = {
    customerName: document.getElementById("customerName").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    address: document.getElementById("address").value.trim(),
    items: cart,
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  };

  const message = document.getElementById("orderMessage");
  const submitButton = event.target.querySelector("button[type='submit']");

  submitButton.disabled = true;
  submitButton.textContent = "SENDING...";

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
    event.target.reset();

  } catch (error) {
    message.textContent = "Order could not be submitted. Please try again.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "PLACE ORDER";
  }
});

updateCart();
