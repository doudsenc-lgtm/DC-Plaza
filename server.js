const express = require("express");
const path = require("path");
const fs = require("fs");
const Stripe = require("stripe");

const app = express();
const PORT = process.env.PORT || 3000;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const EBOOK_PATH = path.join(__dirname, "ebook.pdf");

async function sendEbookEmail({ customerEmail, eventId }) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    throw new Error("Resend email configuration is missing");
  }
  if (!fs.existsSync(EBOOK_PATH)) {
    throw new Error("Ebook file is unavailable");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `stripe-checkout-${eventId}`
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [customerEmail],
      subject: "Votre ebook — Kreye Premye Antrepriz Ou",
      text: "Merci pour votre achat. Votre ebook Kreye Premye Antrepriz Ou est joint à cet email.",
      attachments: [{
        filename: "ebook.pdf",
        content: fs.readFileSync(EBOOK_PATH).toString("base64")
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Resend delivery failed: ${response.status}`);
  }
}

app.post("/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error.message);
    return res.status(400).send("Invalid webhook signature");
  }

  if (event.type !== "checkout.session.completed") {
    return res.sendStatus(200);
  }

  const session = event.data.object;
  if (session.payment_status !== "paid" || session.metadata?.product !== "dc_plaza_ebook") {
    return res.sendStatus(200);
  }

  const customerEmail = session.customer_details?.email || session.customer_email;
  if (!customerEmail) {
    console.error("Paid ebook checkout session has no customer email", session.id);
    return res.status(500).send("Customer email is missing");
  }

  try {
    await sendEbookEmail({ customerEmail, eventId: event.id });
    return res.sendStatus(200);
  } catch (error) {
    console.error("Ebook email delivery failed", error);
    return res.status(500).send("Ebook delivery failed");
  }
});

app.use(express.static(path.join(__dirname, "public")));

/**
 * Creates a Stripe Checkout Session for the ebook.
 *
 * Required environment variables:
 * STRIPE_SECRET_KEY=sk_live_...
 * STRIPE_PRICE_ID=price_...
 * PUBLIC_BASE_URL=https://your-domain.com
 * STRIPE_WEBHOOK_SECRET=whsec_...
 * RESEND_API_KEY=re_...
 * RESEND_FROM_EMAIL=ebooks@your-verified-domain.com
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

    if (!fs.existsSync(EBOOK_PATH)) return res.status(404).send("Fichier indisponible.");

    res.download(EBOOK_PATH, "DC_PLAZA_Ebook.pdf");
  } catch (error) {
    console.error(error);
    res.status(400).send("Lien de téléchargement invalide ou expiré.");
  }
});

app.listen(PORT, () => {
  console.log(`DC PLAZA store running on port ${PORT}`);
});
