# Express Products API

A layered REST API built with Node.js, ES modules, and Express 5. Product records are stored in `src/data/products.json`.

## Run locally

```sh
npm install
npm run dev
```

The server listens on port `3000` by default. Set `PORT` to use another port.

## Endpoints

| Method | Path | Body | Success code | Error codes |
|---|---|---|---:|---|
| GET | `/api/health` | None | 200 | — |
| GET | `/api/products` | None; optional `category`, `q`, and `sort=price\|-price` query parameters | 200 | 500 |
| GET | `/api/products/:id` | None | 200 | 404, 500 |
| POST | `/api/products` | Required product JSON | 201 | 400, 422, 500 |
| PUT | `/api/products/:id` | Complete product JSON | 200 | 400, 404, 422, 500 |
| PATCH | `/api/products/:id` | One or more product fields | 200 | 400, 404, 422, 500 |
| DELETE | `/api/products/:id` | None | 204 | 404, 500 |

Product bodies contain `name` (2–100 characters), `sku` (unique and matching `AAA-0000`), `category` (`Home`, `Outdoors`, `Electronics`, or `Stationery`), `price` (number greater than zero), and `stock` (integer greater than or equal to zero). The API assigns `id` and `createdAt`.

Successful responses use `{ "data": ... }`; errors use `{ "error": { "message": "..." } }`. Product validation errors (422) also include a `fields` object mapping invalid fields to messages. A create response includes a `Location` header pointing to the new product. Delete returns no response body.

## Example curl commands

List products:

```sh
curl -i "http://localhost:3000/api/products"
```

Search and sort by ascending price:

```sh
curl -i "http://localhost:3000/api/products?q=planner&sort=price"
```

Filter by category:

```sh
curl -i "http://localhost:3000/api/products?category=Electronics"
```

Create a product (copy its returned `data.id` for the following commands):

```sh
curl -i -X POST "http://localhost:3000/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"Example Desk Lamp","sku":"EXM-1200","category":"Home","price":49.99,"stock":10}'
```

Get one product:

```sh
curl -i "http://localhost:3000/api/products/PRODUCT_ID"
```

Replace all editable product fields:

```sh
curl -i -X PUT "http://localhost:3000/api/products/PRODUCT_ID" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Desk Lamp","sku":"EXM-1201","category":"Home","price":54.99,"stock":8}'
```

Update only the stock:

```sh
curl -i -X PATCH "http://localhost:3000/api/products/PRODUCT_ID" \
  -H "Content-Type: application/json" \
  -d '{"stock":6}'
```

Delete a product:

```sh
curl -i -X DELETE "http://localhost:3000/api/products/PRODUCT_ID"
```

## VS Code REST Client

Open [`requests.http`](./requests.http) and send requests from the editor. It includes named requests for health, list/search/filter/sort, create, invalid and duplicate creates, get, update, patch, delete, and 404 cases. Run `create` first; the subsequent requests that address or conflict with that product reuse its response ID or SKU.
