def test_create_and_get_product(client, make_user, make_product):
    headers, _ = make_user()
    product = make_product(headers)
    res = client.get(f"/api/products/{product['id']}")
    assert res.status_code == 200
    data = res.get_json()["product"]
    assert data["title"] == "Casio Calculator"
    # Seller info must not leak email or phone.
    assert "email" not in data["seller"]
    assert "phone" not in data["seller"]


def test_create_requires_login(client):
    res = client.post("/api/products", json={"title": "x", "price": 1, "category": "Other", "condition": "New"})
    assert res.status_code == 401


def test_validation_errors(client, make_user):
    headers, _ = make_user()
    res = client.post("/api/products", json={"title": "", "price": -5, "category": "Nope", "condition": "??"}, headers=headers)
    assert res.status_code == 422
    assert {"title", "price", "category", "condition"} <= set(res.get_json()["fields"])


def test_rejects_unsafe_image_value(client, make_user):
    headers, _ = make_user()
    res = client.post("/api/products", headers=headers, json={
        "title": "x", "price": 1, "category": "Other", "condition": "New", "image": "javascript:alert(1)",
    })
    assert res.status_code == 422
    assert "image" in res.get_json()["fields"]


def test_only_owner_can_edit_or_delete(client, make_user, make_product):
    owner, _ = make_user(email="owner@college.edu")
    other, _ = make_user(email="other@college.edu")
    product = make_product(owner)

    assert client.put(f"/api/products/{product['id']}", json={"price": 1}, headers=other).status_code == 403
    assert client.delete(f"/api/products/{product['id']}", headers=other).status_code == 403
    assert client.put(f"/api/products/{product['id']}", json={"price": 99}, headers=owner).status_code == 200
    assert client.delete(f"/api/products/{product['id']}", headers=owner).status_code == 200
    assert client.get(f"/api/products/{product['id']}").status_code == 404


def test_search_filter_sort(client, make_user, make_product):
    headers, _ = make_user()
    make_product(headers, title="Physics Book", category="Textbooks", price=300)
    make_product(headers, title="Old Cycle", category="Cycles", price=2500)
    make_product(headers, title="Scientific Calculator", category="Calculators", price=900)

    assert client.get("/api/products?search=cycle").get_json()["count"] == 1
    assert client.get("/api/products?category=Textbooks").get_json()["count"] == 1
    prices = [p["price"] for p in client.get("/api/products?sort=price_desc").get_json()["products"]]
    assert prices == sorted(prices, reverse=True)


def test_pagination(client, make_user, make_product):
    headers, _ = make_user()
    for i in range(5):
        make_product(headers, title=f"Item {i}")
    page1 = client.get("/api/products?per_page=2&page=1").get_json()
    page3 = client.get("/api/products?per_page=2&page=3").get_json()
    assert page1["count"] == 5 and len(page1["products"]) == 2 and page1["has_more"] is True
    assert len(page3["products"]) == 1 and page3["has_more"] is False


def test_sold_items_leave_marketplace(client, make_user, make_product):
    headers, _ = make_user()
    product = make_product(headers)
    client.put(f"/api/products/{product['id']}", json={"status": "sold"}, headers=headers)
    assert client.get("/api/products").get_json()["count"] == 0
    client.put(f"/api/products/{product['id']}", json={"status": "available"}, headers=headers)
    assert client.get("/api/products").get_json()["count"] == 1


def test_price_suggestion(client, make_user, make_product):
    headers, _ = make_user()
    assert client.get("/api/products/price-suggestion?category=Calculators").get_json()["suggestion"] is None
    for price in (400, 500, 600):
        make_product(headers, price=price)
    s = client.get("/api/products/price-suggestion?category=Calculators&condition=Good").get_json()["suggestion"]
    assert s["median"] == 500 and s["min"] == 400 and s["max"] == 600


def test_wishlist_flow_and_cleanup_on_delete(client, make_user, make_product):
    seller, _ = make_user(email="seller@college.edu")
    buyer, _ = make_user(email="buyer@college.edu")
    product = make_product(seller)
    pid = product["id"]

    assert client.post(f"/api/wishlist/{pid}", headers=buyer).status_code == 201
    assert client.post(f"/api/wishlist/{pid}", headers=buyer).status_code == 409
    assert len(client.get("/api/wishlist", headers=buyer).get_json()["products"]) == 1

    # Deleting the product must also clear saved entries without errors.
    assert client.delete(f"/api/products/{pid}", headers=seller).status_code == 200
    assert client.get("/api/wishlist", headers=buyer).get_json()["products"] == []


def test_upload_rejects_non_images_and_accepts_png(client, make_user):
    import io
    headers, _ = make_user()

    bad = client.post("/api/uploads", headers=headers, content_type="multipart/form-data",
                      data={"image": (io.BytesIO(b"not an image at all"), "evil.png")})
    assert bad.status_code == 422

    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
    ok = client.post("/api/uploads", headers=headers, content_type="multipart/form-data",
                     data={"image": (io.BytesIO(png), "photo.png")})
    assert ok.status_code == 201
    path = ok.get_json()["path"]
    assert path.startswith("/uploads/") and path.endswith(".png")
    assert client.get(path).status_code == 200
