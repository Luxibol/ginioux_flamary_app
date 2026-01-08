/**
 * Contrôleur produits : recherche de produits (autocomplete).
 * Recherche sur le libellé PDF exact.
 */
const productsRepository = require("../repositories/products.repository");

/**
 * GET /products/search?q=...&limit=...
 * Retour : { data: [...] }
 * Note : si q est vide, retourne une liste vide.
 */
async function searchProducts(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ data: [] });

    const rows = await productsRepository.searchProducts(q, req.query.limit);
    return res.json({ data: rows });
  } catch (err) {
    console.error("GET /products/search error:", err);
    return res
      .status(500)
      .json({ error: "Erreur lors de la recherche produit" });
  }
}

module.exports = { searchProducts };
