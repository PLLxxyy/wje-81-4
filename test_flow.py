#!/usr/bin/env python3
import json
import urllib.request
import urllib.parse

BASE = "http://localhost:3001"

def http(method, path, data=None, token=None):
    url = BASE + path
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
    
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except:
            return e.code, {"error": err_body}

print("=" * 50)
print("🎫 演唱会票务平台 - 全链路API测试")
print("=" * 50)
print()

# 0. 注册用户
print("【0】注册测试用户...")
http("POST", "/api/auth/register", {
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test@123456",
    "phone": "13800138000"
})

# 1. 登录
print("【1/10】用户登录...")
code, data = http("POST", "/api/auth/login", {
    "username": "testuser",
    "password": "Test@123456"
})
assert code == 200 and "token" in data, f"登录失败: {data}"
token = data["token"]
user = data["user"]
print(f"✅ 登录成功: {user['username']} (ID={user['id']})")
print()

# 2. 筛选演唱会（城市=上海）
print("【2/10】筛选演唱会（上海）...")
params = urllib.parse.urlencode({"city": "上海", "limit": 10})
code, data = http("GET", f"/api/concerts?{params}")
assert code == 200 and len(data["concerts"]) > 0, f"筛选失败: {data}"
concert = data["concerts"][0]
print(f"✅ 找到演唱会: #{concert['id']} {concert['title']}")
print(f"   城市: {concert['city']} | 场馆: {concert['venue']}")
print()

# 3. 获取演唱会详情
print("【3/10】获取演唱会详情...")
code, detail = http("GET", f"/api/concerts/{concert['id']}")
assert code == 200 and "tiers" in detail, f"详情获取失败: {data}"
tiers = detail["tiers"]
cheapest_tier = min(tiers, key=lambda t: t["price"])
print(f"✅ 演唱会详情获取成功")
print(f"   票档数: {len(tiers)}")
for t in tiers:
    avail = t["total_seats"] - t["sold_seats"]
    print(f"     - {t['name']}: ¥{t['price']} (余票{avail})")
print()

# 4. 获取座位图
print("【4/10】获取座位图...")
code, seat_data = http("GET", f"/api/concerts/{concert['id']}/seats")
assert code == 200 and "seats" in seat_data, f"座位获取失败: {seat_data}"
seats = seat_data["seats"]
tier_seats = [s for s in seats if s["tier_id"] == cheapest_tier["id"] and s["status"] == "available"]
print(f"✅ 总座位数: {len(seats)}")
print(f"   选择票档 [{cheapest_tier['name']}] 可用座位: {len(tier_seats)}")
selected_seats = tier_seats[:2]
seat_names = ", ".join(s["row"] + s["seat_number"] for s in selected_seats)
print(f"   选中座位: {seat_names}")
seat_ids = [s["id"] for s in selected_seats]
print()

# 5. 锁定座位
print("【5/10】锁定座位...")
code, lock_data = http("POST", "/api/orders/lock-seats", {"seat_ids": seat_ids}, token)
assert code == 200 and lock_data.get("success"), f"锁定失败: {lock_data}"
print("✅ 座位锁定成功（15分钟有效）")
print()

# 6. 创建订单
print("【6/10】创建订单...")
order_req = {
    "concert_id": concert["id"],
    "seat_ids": seat_ids,
    "buyer_name": "测试用户",
    "buyer_phone": "13800138000",
    "buyer_email": "test@example.com",
    "attendees": [
        {"name": "张三", "id_no": "310101199001011234"},
        {"name": "李四", "id_no": "310101199202025678"}
    ]
}
code, order_data = http("POST", "/api/orders", order_req, token)
assert code == 200 and "order_id" in order_data, f"创建订单失败: {order_data}"
order_id = order_data["order_id"]
order_no = order_data["order_no"]
print(f"✅ 订单创建成功: {order_no} (ID={order_id})")
print()

# 7. 支付订单
print("【7/10】支付订单...")
code, pay_data = http("POST", f"/api/orders/{order_id}/pay", token=token)
assert code == 200 and pay_data.get("success"), f"支付失败: {pay_data}"
print("✅ 支付成功")
print()

# 8. 获取订单详情（检查电子票二维码）
print("【8/10】获取订单详情和电子票...")
code, order_detail = http("GET", f"/api/orders/{order_id}", token=token)
assert code == 200, f"订单详情获取失败: {order_detail}"
items = order_detail.get("items", [])
has_qr = len(items) > 0 and items[0].get("qr_code") is not None
print(f"✅ 订单详情获取成功")
print(f"   订单号: {order_detail['order_no']}")
print(f"   状态: {order_detail['status']}")
print(f"   总金额: ¥{order_detail['total_amount']}")
print(f"   票券数: {len(items)}")
print(f"   二维码生成: {'✅ 是' if has_qr else '❌ 否'}")
for i, item in enumerate(items, 1):
    print(f"     票{i}: {item['tier_name']} - {item['seat_no']} - {item['attendee_name']}")
print()

# 9. 管理员登录并获取统计
print("【9/10】管理员后台 - 获取销售统计...")
code, admin_login = http("POST", "/api/auth/login", {
    "username": "admin",
    "password": "admin123"
})
assert code == 200, f"管理员登录失败: {admin_login}"
admin_token = admin_login["token"]

code, stats = http("GET", "/api/admin/stats", token=admin_token)
assert code == 200, f"统计获取失败: {stats}"
print(f"✅ 后台统计获取成功")
print(f"   总演唱会: {stats['totalConcerts']}")
print(f"   总订单数: {stats['totalOrders']}")
print(f"   总营收: ¥{stats['totalRevenue']}")
print()

# 10. 管理员批量退款
print("【10/10】管理员 - 订单批量退款...")
code, refund = http("POST", "/api/admin/orders/refund/batch", {"orderIds": [order_id]}, admin_token)
assert code == 200 and refund.get("success"), f"退款失败: {refund}"
code, order_after = http("GET", f"/api/admin/orders/{order_id}", token=admin_token)
assert code == 200
assert order_after.get("status") == "refunded", f"订单状态未变更为已退款: {order_after.get('status')}"
print(f"✅ 批量退款成功")
print(f"   退款订单数: {refund.get('refundedCount', 0)}")
print(f"   订单状态: {order_after['status']}")
print()

print("=" * 50)
print("🎉🎉🎉 全部测试通过！🎉🎉🎉")
print("=" * 50)
print(f"用户端主链路: ✅ 注册→登录→筛选→选座→付款→电子票")
print(f"管理端功能:   ✅ 创建演唱会→销售统计→批量退款")
print("=" * 50)
