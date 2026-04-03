export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const { message, shopifyToken, shopifyStore, claudeKey } = req.body;

    if (!message || !shopifyToken || !shopifyStore || !claudeKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let shopifyContext = '';

    try {
      const shopifyRes = await fetch(
        `https://${shopifyStore}/api/2024-01/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': shopifyToken,
          },
          body: JSON.stringify({
            query: `{
              products(first: 10, query: "${message.replace(/"/g,"'")}") {
                edges {
                  node {
                    title
                    description
                    handle
                    priceRange {
                      minVariantPrice { amount currencyCode }
                    }
                    availableForSale
                  }
                }
              }
              shop {
                name
                description
                primaryDomain { url }
              }
            }`
          })
        }
      );

      if (shopifyRes.ok) {
        const shopData = await shopifyRes.json();
        const shop     = shopData?.data?.shop;
        const products = shopData?.data?.products?.edges || [];

        if (shop) {
          shopifyContext += `Store Name: ${shop.name}\n`;
          if (shop.description) shopifyContext += `Store Info: ${shop.description}\n`;
          shopifyContext += `Store URL: ${shop.primaryDomain?.url}\n\n`;
        }

        if (products.length > 0) {
          shopifyContext += 'Available Products:\n';
          products.forEach(({ node: p }) => {
            const price   = p.priceRange?.minVariantPrice;
            const inStock = p.availableForSale ? 'In Stock' : 'Out of Stock';

            shopifyContext += `- ${p.title} | Price: ${price?.amount} ${price?.currencyCode} | ${inStock}\n`;

            if (p.description) {
              shopifyContext += `  Description: ${p.description.substring(0, 120)}...\n`;
            }
          });
        } else {
          shopifyContext += 'No products found.\n';
        }
      }

    } catch (err) {
      shopifyContext = 'Store data unavailable\n';
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        system: `You are a helpful shopping assistant.\n\n${shopifyContext}`,
        messages: [{ role: 'user', content: message }]
      })
    });

    const data = await claudeRes.json();
    const reply = data?.content?.[0]?.text || 'No response';

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}
