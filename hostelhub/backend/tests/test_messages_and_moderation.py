def test_message_flow(client, make_user, make_product):
    seller, seller_user = make_user(email="seller@college.edu")
    buyer, buyer_user = make_user(email="buyer@college.edu")
    product = make_product(seller)
    pid = product["id"]

    res = client.post("/api/messages", json={"product_id": pid, "body": "Is this available?"}, headers=buyer)
    assert res.status_code == 201

    assert client.get("/api/messages/unread-count", headers=seller).get_json()["unread"] == 1
    convs = client.get("/api/messages/conversations", headers=seller).get_json()["conversations"]
    assert len(convs) == 1 and convs[0]["unread"] == 1 and convs[0]["other_user"]["id"] == buyer_user["id"]

    thread = client.get(f"/api/messages/thread?product_id={pid}&user_id={buyer_user['id']}", headers=seller).get_json()
    assert len(thread["messages"]) == 1
    assert client.get("/api/messages/unread-count", headers=seller).get_json()["unread"] == 0

    reply = client.post("/api/messages", json={"product_id": pid, "body": "Yes!", "receiver_id": buyer_user["id"]}, headers=seller)
    assert reply.status_code == 201
    assert client.get("/api/messages/unread-count", headers=buyer).get_json()["unread"] == 1


def test_message_validation_and_permissions(client, make_user, make_product):
    seller, _ = make_user(email="seller@college.edu")
    buyer, buyer_user = make_user(email="buyer@college.edu")
    stranger, stranger_user = make_user(email="stranger@college.edu")
    pid = make_product(seller)["id"]

    assert client.post("/api/messages", json={"product_id": pid, "body": "   "}, headers=buyer).status_code == 422
    assert client.post("/api/messages", json={"product_id": pid, "body": "x" * 1001}, headers=buyer).status_code == 422
    assert client.post("/api/messages", json={"product_id": 9999, "body": "hi"}, headers=buyer).status_code == 404
    assert client.post("/api/messages", json={"product_id": pid, "body": "hi"}).status_code == 401

    # Seller can't start a chat with someone who never wrote first.
    res = client.post("/api/messages", json={"product_id": pid, "body": "hi", "receiver_id": stranger_user["id"]}, headers=seller)
    assert res.status_code == 403

    # A third person can't read someone else's thread (they only ever see their own messages).
    client.post("/api/messages", json={"product_id": pid, "body": "hello"}, headers=buyer)
    thread = client.get(f"/api/messages/thread?product_id={pid}&user_id={buyer_user['id']}", headers=stranger).get_json()
    assert thread["messages"] == []


def test_report_flow_and_admin(client, make_user, make_product):
    seller, _ = make_user(email="seller@college.edu")
    buyer, _ = make_user(email="buyer@college.edu")
    admin, admin_user = make_user(email="admin@college.edu")
    pid = make_product(seller)["id"]

    assert admin_user["is_admin"] is True
    assert client.post(f"/api/moderation/report/{pid}", json={"reason": "Spam or scam"}, headers=seller).status_code == 403
    assert client.post(f"/api/moderation/report/{pid}", json={"reason": "bogus"}, headers=buyer).status_code == 422
    assert client.post(f"/api/moderation/report/{pid}", json={"reason": "Spam or scam"}, headers=buyer).status_code == 201
    assert client.post(f"/api/moderation/report/{pid}", json={"reason": "Spam or scam"}, headers=buyer).status_code == 409

    # Only admins can see reports.
    assert client.get("/api/moderation/reports", headers=buyer).status_code == 403
    reports = client.get("/api/moderation/reports", headers=admin).get_json()["reports"]
    assert len(reports) == 1 and reports[0]["product"]["id"] == pid

    assert client.delete(f"/api/moderation/products/{pid}", headers=buyer).status_code == 403
    assert client.delete(f"/api/moderation/products/{pid}", headers=admin).status_code == 200
    assert client.get(f"/api/products/{pid}").status_code == 404
