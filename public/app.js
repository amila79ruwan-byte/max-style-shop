let cart = [];

function updateCart() {
  const cartCount = document.getElementById("cart-count");
  const cartItems = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");

  const count = cart.reduce((sum, item) => sum + item.qty, 0);

  if (cartCount) cartCount.textContent = count;

  if (cartItems) {
    cartItems.innerHTML = "";

    cart.forEach((item, index) => {
      const div = document.createElement("div");

      div.innerHTML = `
        <p>${item.name} - Rs. ${item.price}</p>
        <p>Size: ${item.size} | Colour: ${item.color}</p>
        <button onclick="changeQty(${index}, -1)">−</button>
        ${item.qty}
        <button onclick="changeQty(${index}, 1)">+</button>
        <button onclick="removeItem(${index})">Remove</button>
      `;

      cartItems.appendChild(div);
    });
  }

  if (cartTotal) {
    cartTotal.textContent = cart.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );
  }
}

function changeQty(index, amount) {
  cart[index].qty += amount;

  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }

  updateCart();
}

function removeItem(index) {
  cart.splice(index, 1);
  updateCart();
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".product").forEach(product => {
    const button = product.querySelector("button");

    if (!button) return;

    button.addEventListener("click", function () {
      const name = product.querySelector("h3")?.textContent || "Product";
      const priceText = product.querySelector("p")?.textContent || "";
      const price = Number(priceText.replace(/[^\d.]/g, ""));

      const size = product.querySelector(".product-size")?.value;
      const color = product.querySelector(".product-color")?.value;

      if (!size || !color) {
        alert("Please select size and colour!");
        return;
      }

      const existing = cart.find(item =>
        item.name === name &&
        item.size === size &&
        item.color === color
      );

      if (existing) {
        existing.qty++;
      } else {
        cart.push({
          name,
          price,
          size,
          color,
          qty: 1
        });
      }

      updateCart();
      alert("Added to Bag!");
    });
  });

  updateCart();
});
