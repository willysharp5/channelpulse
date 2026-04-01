interface ShopifyGraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
  extensions?: { cost: { requestedQueryCost: number; actualQueryCost: number; throttleStatus: { maximumAvailable: number; currentlyAvailable: number; restoreRate: number } } };
}

export class ShopifyClient {
  private shop: string;
  private accessToken: string;
  private apiVersion = "2024-10";

  constructor(shop: string, accessToken: string) {
    this.shop = shop;
    this.accessToken = accessToken;
  }

  async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(
      `https://${this.shop}/admin/api/${this.apiVersion}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": this.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Shopify API error ${response.status}: ${text}`);
    }

    const json: ShopifyGraphQLResponse<T> = await response.json();

    if (json.errors?.length) {
      throw new Error(`Shopify GraphQL errors: ${json.errors.map((e) => e.message).join(", ")}`);
    }

    return json.data;
  }

  async fetchOrders(since?: string, cursor?: string) {
    const queryFilter = since ? `updated_at:>'${since}'` : "";

    const query = `
      query GetOrders($first: Int!, $after: String, $query: String) {
        orders(first: $first, after: $after, query: $query, sortKey: UPDATED_AT) {
          edges {
            node {
              id
              name
              displayFinancialStatus
              displayFulfillmentStatus
              totalPriceSet { shopMoney { amount currencyCode } }
              subtotalPriceSet { shopMoney { amount currencyCode } }
              totalTaxSet { shopMoney { amount currencyCode } }
              totalShippingPriceSet { shopMoney { amount currencyCode } }
              totalDiscountsSet { shopMoney { amount currencyCode } }
              createdAt
              updatedAt
              customer { displayName email }
              lineItems(first: 50) {
                edges {
                  node {
                    title
                    sku
                    quantity
                    originalTotalSet { shopMoney { amount currencyCode } }
                    product { id }
                  }
                }
              }
            }
            cursor
          }
          pageInfo { hasNextPage }
        }
      }
    `;

    return this.graphql<{
      orders: {
        edges: Array<{
          node: {
            id: string;
            name: string;
            displayFinancialStatus: string;
            displayFulfillmentStatus: string;
            totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
            subtotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
            totalTaxSet: { shopMoney: { amount: string; currencyCode: string } };
            totalShippingPriceSet: { shopMoney: { amount: string; currencyCode: string } };
            totalDiscountsSet: { shopMoney: { amount: string; currencyCode: string } };
            createdAt: string;
            updatedAt: string;
            customer: { displayName: string; email: string } | null;
            lineItems: {
              edges: Array<{
                node: {
                  title: string;
                  sku: string | null;
                  quantity: number;
                  originalTotalSet: { shopMoney: { amount: string; currencyCode: string } };
                  product: { id: string } | null;
                };
              }>;
            };
          };
          cursor: string;
        }>;
        pageInfo: { hasNextPage: boolean };
      };
    }>(query, { first: 50, after: cursor, query: queryFilter || undefined });
  }

  async fetchProducts(cursor?: string) {
    const query = `
      query GetProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          edges {
            node {
              id
              title
              status
              featuredImage { url }
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    inventoryQuantity
                  }
                }
              }
            }
            cursor
          }
          pageInfo { hasNextPage }
        }
      }
    `;

    return this.graphql<{
      products: {
        edges: Array<{
          node: {
            id: string;
            title: string;
            status: string;
            featuredImage: { url: string } | null;
            variants: {
              edges: Array<{
                node: {
                  id: string;
                  title: string;
                  sku: string | null;
                  price: string;
                  inventoryQuantity: number | null;
                };
              }>;
            };
          };
          cursor: string;
        }>;
        pageInfo: { hasNextPage: boolean };
      };
    }>(query, { first: 50, after: cursor });
  }
}
