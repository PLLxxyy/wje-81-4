#!/bin/bash
export PATH="/usr/local/bin:$PATH"

BASE="http://localhost:3001"

echo "========================================"
echo "🎫 演唱会票务平台 - 全链路测试脚本"
echo "========================================"
echo ""

echo "【1/7】用户登录..."
LOGIN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test@123456"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  echo "$LOGIN"
  exit 1
fi
echo "✅ 登录成功，Token: ${TOKEN:0:40}..."
echo ""

echo "【2/7】获取演唱会列表（筛选上海）..."
CONCERTS=$(curl -s "$BASE/api/concerts?city=上海&limit=10")
CONCERT_ID=$(echo "$CONCERTS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['concerts'][0]['id'] if d['concerts'] else '')")
CONCERT_TITLE=$(echo "$CONCERTS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['concerts'][0]['title'] if d['concerts'] else '')")
if [ -z "$CONCERT_ID" ]; then
  echo "❌ 未找到上海的演唱会"
  exit 1
fi
echo "✅ 找到演唱会 #$CONCERT_ID: $CONCERT_TITLE"
echo ""

echo "【3/7】获取演唱会详情..."
DETAIL=$(curl -s "$BASE/api/concerts/$CONCERT_ID")
TIER_ID=$(echo "$DETAIL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['tiers'][-1]['id'])")
TIER_NAME=$(echo "$DETAIL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['tiers'][-1]['name'])")
TIER_PRICE=$(echo "$DETAIL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['tiers'][-1]['price'])")
echo "✅ 票档选择: $TIER_NAME (¥$TIER_PRICE) - ID=$TIER_ID"
echo ""

echo "【4/7】获取可用座位..."
SEATS=$(curl -s "$BASE/api/concerts/$CONCERT_ID/seats")
SEAT_IDS=$(echo "$SEATS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
tier_id=$TIER_ID
avail=[s['id'] for s in d['seats'] if s['tier_id']==tier_id and s['status']=='available'][:2]
print(','.join(map(str,avail)))
")
echo "✅ 获取到座位ID: $SEAT_IDS"
echo ""

echo "【5/7】锁定座位..."
LOCK=$(curl -s -X POST "$BASE/api/orders/lock-seats" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"seat_ids\":[$SEAT_IDS]}")
LOCK_SUCCESS=$(echo "$LOCK" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
if [ "$LOCK_SUCCESS" != "True" ]; then
  echo "❌ 锁定座位失败"
  echo "$LOCK"
  exit 1
fi
echo "✅ 座位锁定成功"
echo ""

echo "【6/7】创建订单并支付..."
ORDER_DATA=$(cat <<EOF
{
  "concert_id": $CONCERT_ID,
  "seat_ids": [$SEAT_IDS],
  "buyer_name": "测试用户",
  "buyer_phone": "13800138000",
  "buyer_email": "test@example.com",
  "attendees": [
    {"name": "张三", "id_no": "310101199001011234"},
    {"name": "李四", "id_no": "310101199202025678"}
  ]
}
EOF
)

CREATE_ORDER=$(curl -s -X POST "$BASE/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$ORDER_DATA")
ORDER_ID=$(echo "$CREATE_ORDER" | python3 -c "import sys,json; print(json.load(sys.stdin).get('order_id',''))")
if [ -z "$ORDER_ID" ]; then
  echo "❌ 创建订单失败"
  echo "$CREATE_ORDER"
  exit 1
fi
ORDER_NO=$(echo "$CREATE_ORDER" | python3 -c "import sys,json; print(json.load(sys.stdin)['order_no'])")
echo "✅ 订单创建成功: #$ORDER_NO (ID=$ORDER_ID)"

PAY=$(curl -s -X POST "$BASE/api/orders/$ORDER_ID/pay" \
  -H "Authorization: Bearer $TOKEN")
PAY_SUCCESS=$(echo "$PAY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
if [ "$PAY_SUCCESS" != "True" ]; then
  echo "❌ 支付失败"
  echo "$PAY"
  exit 1
fi
echo "✅ 支付成功"
echo ""

echo "【7/7】获取订单详情（检查二维码）..."
ORDER_DETAIL=$(curl -s "$BASE/api/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN")
HAS_QR=$(echo "$ORDER_DETAIL" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d.get('items',[]); print('YES' if items and items[0].get('qr_code') else 'NO')")
AMOUNT=$(echo "$ORDER_DETAIL" | python3 -c "import sys,json; print(json.load(sys.stdin)['total_amount'])")
TICKET_COUNT=$(echo "$ORDER_DETAIL" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('items',[])))")
if [ "$HAS_QR" != "YES" ]; then
  echo "⚠️  警告: 未获取到二维码"
else
  echo "✅ 电子票二维码生成成功"
fi
echo "✅ 订单金额: ¥$AMOUNT | 票券数量: $TICKET_COUNT 张"
echo ""

echo "========================================"
echo "🎉 用户端主链路测试全部通过！"
echo "========================================"
echo "订单号: $ORDER_NO"
echo "演唱会: $CONCERT_TITLE"
echo "总金额: ¥$AMOUNT"
echo "========================================"
