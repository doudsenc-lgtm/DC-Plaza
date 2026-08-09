const express = require("express");
const path = require("path");
const fs = require("fs");
const Stripe = require("stripe");

const app = express();
const PORT = process.env.PORT || 3000;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.static(path.join(__dirname, "public")));

/**
 * Creates a Stripe Checkout Session for the ebook.
 *
 * Required environment variables:
 * STRIPE_SECRET_KEY=sk_live_...
 * STRIPE_PRICE_ID=price_...
 * PUBLIC_BASE_URL=https://your-domain.com
 */
app.get("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.PUBLIC_BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.PUBLIC_BASE_URL}/?payment=cancelled`,
      customer_creation: "always",
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      metadata: { product: "dc_plaza_ebook" }
    });

    res.redirect(303, session.url);
  } catch (error) {
    console.error(error);
    res.status(500).send("Impossible de créer la session de paiement.");
  }
});

/**
 * Verifies that the Stripe Checkout Session was actually paid.
 * Only then does it expose the PDF.
 */
app.get("/download-ebook", async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) return res.status(400).send("Session de paiement manquante.");

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (
      session.payment_status !== "paid" ||
      session.metadata?.product !== "dc_plaza_ebook"
    ) {
      return res.status(403).send("Paiement non confirmé.");
    }

    const file = path.join(__dirname, "ebook.pdf");
    if (!fs.existsSync(file)) return res.status(404).send("Fichier indisponible.");

    res.download(file, "DC_Plaza_Multiservice_Ebook.pdf");
  } catch (error) {
    console.error(error);
    res.status(400).send("Lien de téléchargement invalide ou expiré.");
  }
});

app.listen(PORT, () => {
  console.log(`DC Plaza store running on port ${PORT}`);
});
