export function generateWhatsAppMessage(order: any, items: any[]): string {
  return [
    '*Nouvelle commande LXLunettes*',
    `Numéro : ${order.orderNumber}`,
    `Client : ${order.customerName}`,
    `Téléphone : ${order.customerPhone}`,
    order.customerEmail ? `Email : ${order.customerEmail}` : null,
    `Ville : ${order.city}, ${order.country}`,
    order.address ? `Adresse : ${order.address}` : null,
    '',
    '*Produits :*',
    ...items.map(
      (item) =>
        `- ${item.productName} | Code: ${item.productSku} | x${item.quantity} = ${parseFloat(String(item.totalPrice)).toFixed(2)} MAD`,
    ),
    '',
    `Sous-total : ${parseFloat(String(order.subtotal)).toFixed(2)} MAD`,
    parseFloat(String(order.shippingFee)) > 0
      ? `Livraison : ${parseFloat(String(order.shippingFee)).toFixed(2)} MAD`
      : null,
    `*Total : ${parseFloat(String(order.total)).toFixed(2)} MAD*`,
    order.customerNote ? `\nNote : ${order.customerNote}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n');
}
