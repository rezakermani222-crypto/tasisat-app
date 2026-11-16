#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
پاسخ‌گوی خودکار بات بله @tasisatrozbot
اجرا توسط GitHub Actions هر ۲ دقیقه (مخزن عمومی = رایگان).
- به پیام مشتری‌ها منوی دکمه‌ای می‌فرستد
- دکمه شماره تماس‌ها: دو شماره + دکمه تماس مستقیم (tel:)
- دکمه ثبت سفارش آنلاین: لینک صفحه سفارش سایت
- سوال آزاد مشتری → به چت مالک فوروارد می‌شود
- پیام خود مالک → فقط منو (بدون فوروارد)
وضعیت offset در bot/.offset نگه داشته می‌شود (با actions/cache بین اجراها منتقل می‌شود).
"""
import json
import os
import re
import time
import urllib.error
import urllib.request

OWNER = 1893184462  # شناسه چت مالک
SITE = "https://rezakermani222-crypto.github.io/tasisat-app"
ORDER_URL = SITE + "/#/order"
OFFSET_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".offset")
MAX_AGE = 172800  # پیام‌های تا ۴۸ ساعت پیش فوروارد می‌شوند؛ قدیمی‌تر فقط offset جلو می‌رود


def load_token():
    """توکن بات از env یا از config.js (منبع واحد تنظیمات کاربر) خوانده می‌شود."""
    env = os.environ.get("BALE_TOKEN")
    if env:
        return env
    cfg_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "config.js")
    with open(cfg_path, encoding="utf-8") as f:
        m = re.search(r'baleBotToken\s*:\s*"([^"]+)"', f.read())
    return m.group(1) if m else ""


TOKEN = load_token()

BTN_PHONES = "شماره تماس‌ها"
BTN_ORDER = "ثبت سفارش آنلاین"
BTN_HOURS = "ساعت کاری"
BTN_SERVICES = "خدمات ما"

PHONES_TEXT = "شماره‌های تماس:\nتلفن ثابت: 02166157626\nهمراه: 09982219245"

WELCOME = (
    "سلام! به خدمات تاسیسات ساختمان خوش آمدید.\n\n"
    "از دکمه‌های زیر استفاده کنید یا سوالتان را بنویسید؛ "
    "همکاران ما در اولین فرصت با شما تماس می‌گیرند.\n\n" + PHONES_TEXT
)

HOURS_TEXT = (
    "ساعت کاری: شنبه تا پنجشنبه، از ۸ صبح تا ۸ شب.\n"
    "برای موارد فوری در ساعات کاری تماس بگیرید: 09982219245"
)

SERVICES_TEXT = (
    "خدمات ما:\n"
    "- نصب پکیج دیواری (با تست نشتی و تنظیم اولیه)\n"
    "- سرویس سالانه پکیج\n"
    "- تعمیر و رفع خطا (همه برندها)\n"
    "- هواگیری و تنظیم فشار\n\n"
    "برای ثبت سفارش آنلاین: " + ORDER_URL
)

ORDER_TEXT = "برای ثبت سفارش، صفحه ثبت سفارش را باز کنید و فرم را پر کنید؛ سفارش شما بلافاصله برای ما ارسال می‌شود."

REPLY_KEYBOARD = {
    "keyboard": [
        [BTN_PHONES],
        [BTN_ORDER],
        [BTN_HOURS, BTN_SERVICES],
    ],
    "resize_keyboard": True,
    "is_persistent": True,
}


def call(method, payload, tries=2):
    """یک فراخوانی API بله با تلاش مجدد؛ خروجی (ok, result, description)."""
    last_desc = ""
    for _ in range(tries):
        req = urllib.request.Request(
            "https://tapi.bale.ai/bot" + TOKEN + "/" + method,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                res = json.load(r)
                return res.get("ok"), res.get("result"), res.get("description", "")
        except urllib.error.HTTPError as e:
            try:
                body = json.loads(e.read().decode())
                return body.get("ok", False), body.get("result"), body.get("description", str(e.code))
            except Exception:
                last_desc = "HTTP " + str(e.code)
        except Exception as e:
            last_desc = str(e)
        time.sleep(2)
    return False, None, last_desc


def norm(s):
    """نرمال‌سازی متن دکمه/دستور: حذف نیم‌فاصله و فاصله‌های اضافی."""
    return " ".join(str(s).replace("\u200c", " ").split())


def send(chat_id, text, markup=None):
    payload = {"chat_id": chat_id, "text": text}
    if markup:
        payload["reply_markup"] = markup
    ok, res, desc = call("sendMessage", payload)
    if not ok:
        print("  sendMessage failed:", desc)
    return ok


def handle_message(m):
    """پردازش یک پیام خصوصی؛ خروجی (forward_ok یا None)."""
    chat_id = m.get("chat", {}).get("id")
    name = (m.get("from", {}) or {}).get("first_name", "") or ""
    text = m.get("text") or ""
    t = norm(text)

    if t.lower() == "/phones" or t == norm(BTN_PHONES):
        send(chat_id, PHONES_TEXT, {"inline_keyboard": [[
            {"text": "تماس ثابت 02166157626", "url": "tel:+982166157626"},
            {"text": "تماس همراه 09982219245", "url": "tel:+989982219245"},
        ]]})
        return None

    if t.lower() == "/order" or t == norm(BTN_ORDER):
        send(chat_id, ORDER_TEXT, {"inline_keyboard": [[
            {"text": "باز کردن صفحه ثبت سفارش", "url": ORDER_URL},
        ]]})
        return None

    if t.lower() == "/hours" or t == norm(BTN_HOURS):
        send(chat_id, HOURS_TEXT)
        return None

    if t.lower() == "/services" or t == norm(BTN_SERVICES):
        send(chat_id, SERVICES_TEXT, {"inline_keyboard": [[
            {"text": "مشاهده سایت", "url": SITE},
        ]]})
        return None

    if t.lower() == "/site":
        send(chat_id, "سایت و ثبت سفارش آنلاین:\n" + SITE, {"inline_keyboard": [[
            {"text": "باز کردن سایت", "url": SITE},
        ]]})
        return None

    if t.lower() == "/call":
        send(chat_id, PHONES_TEXT, {"inline_keyboard": [[
            {"text": "تماس ثابت 02166157626", "url": "tel:+982166157626"},
            {"text": "تماس همراه 09982219245", "url": "tel:+989982219245"},
        ]]})
        return None

    if t.lower().startswith("/start") or t in ("سلام", "hi", "hello", "های", "درود"):
        send(chat_id, WELCOME, REPLY_KEYBOARD)
        return None

    # متن آزاد: اگر خود مالک باشد فقط منو؛ اگر مشتری باشد فوروارد به مالک + رسید
    if chat_id == OWNER:
        send(chat_id, WELCOME, REPLY_KEYBOARD)
        return None

    return m  # باید فوروارد شود


def main():
    offset = None
    try:
        with open(OFFSET_FILE) as f:
            offset = int(f.read().strip())
    except Exception:
        offset = None

    payload = {"timeout": 0, "limit": 25}
    if offset:
        payload["offset"] = offset
    if not TOKEN:
        print("BALE_TOKEN secret is not set; skipping.")
        return
    ok, updates, desc = call("getUpdates", payload, tries=1)
    if not ok:
        # تداخل اجرای همزمان (409) یا خطای شبکه: بی‌سروصدا رد کن؛ اجرای بعدی جبران می‌کند
        print("getUpdates failed:", desc)
        return

    now = time.time()
    new_offset = offset
    processed = 0
    for u in updates or []:
        uid = u.get("update_id")
        if uid is None:
            continue
        new_offset = uid + 1
        m = u.get("message") or u.get("edited_message")
        if not m:
            continue
        chat = m.get("chat", {})
        chat_id = chat.get("id")
        if chat.get("type") != "private":
            continue
        age = now - m.get("date", now)
        if age > MAX_AGE:
            print(f"skip old update {uid} (age {int(age)}s)")
            continue
        text = m.get("text") or ""
        name = (m.get("from", {}) or {}).get("first_name", "") or ""
        processed += 1
        print(f"update {uid} | chat {chat_id} | {name} | {text[:40]!r}")

        to_forward = handle_message(m)

        if to_forward:
            okf, resf, descf = call("forwardMessage", {
                "chat_id": OWNER, "from_chat_id": chat_id,
                "message_id": m.get("message_id")})
            print("  forward ok:", okf, descf)
            # دکمه تماس مستقیم با مشتری زیر پیام فورواردشده
            mph = re.search(r"\b09\d{9}\b", text)
            if mph:
                send(OWNER, "تماس با مشتری:", {"inline_keyboard": [[
                    {"text": mph.group(0), "url": "tel:+98" + mph.group(0)[1:]},
                ]]})
            if not okf:
                # اگر فوروارد نشد، متن با مشخصات فرستنده فرستاده می‌شود
                if text:
                    send(OWNER, "پیام از مشتری (" + name + " - " + str(chat_id) + "):\n" + text)
            send(chat_id, "پیام شما ثبت شد؛ همکاران ما در اولین فرصت با شما تماس می‌گیرند.\n\n" + PHONES_TEXT)

    if new_offset is not None and new_offset != offset:
        with open(OFFSET_FILE, "w") as f:
            f.write(str(new_offset))
    print(f"done | processed={processed} | offset={new_offset}")


if __name__ == "__main__":
    main()
