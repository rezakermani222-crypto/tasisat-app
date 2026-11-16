#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
پاسخ‌گوی خودکار بات روبیکا «تاسیسات روز» (rubika.ir/tasisatrozbot) — API v3
اجرا توسط GitHub Actions هر ۲ دقیقه (مخزن عمومی = رایگان).
- توکن فقط از env (Secret گیت‌هاب) خوانده می‌شود؛ هرگز در فایل‌های عمومی نیست.
- به پیام مشتری‌ها متن راهنما و شماره تماس‌ها پاسخ می‌دهد.
- پیام آزاد مشتری → به چت مالک فوروارد می‌شود (وقتی RUBIKA_CHAT_ID تنظیم شده باشد).
- پیام خود مالک → فقط منو (بدون فوروارد).
وضعیت offset در bot/.rubika_offset نگه داشته می‌شود (با actions/cache منتقل می‌شود).
"""
import json
import os
import re
import time
import urllib.error
import urllib.request

BASE = "https://botapi.rubika.ir/v3/"
OFFSET_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".rubika_offset")
MAX_AGE = 172800  # پیام‌های قدیمی‌تر از ۴۸ ساعت پاسخ داده نمی‌شوند (فقط offset جلو می‌رود)

TOKEN = os.environ.get("RUBIKA_TOKEN", "")
OWNER = os.environ.get("RUBIKA_CHAT_ID", "")

SITE = "https://rezakermani222-crypto.github.io/tasisat-app"
ORDER_URL = SITE + "/#/order"

PHONES_TEXT = "شماره‌های تماس:\nتلفن ثابت: 02166157626\nهمراه: 09982219245"
WELCOME = (
    "سلام! به خدمات تاسیسات ساختمان خوش آمدید.\n\n"
    "سوال یا سفارش خود را همین‌جا بنویسید و ارسال کنید؛ "
    "همکاران ما در اولین فرصت با شما تماس می‌گیرند.\n\n"
    "سایت و ثبت سفارش آنلاین:\n" + ORDER_URL + "\n\n" + PHONES_TEXT
)
HOURS_TEXT = (
    "ساعت کاری: شنبه تا پنجشنبه، از ۸ صبح تا ۸ شب.\n"
    "برای موارد فوری تماس بگیرید: 09982219245"
)
SERVICES_TEXT = (
    "خدمات ما:\n"
    "- نصب پکیج دیواری (با تست نشتی و تنظیم اولیه)\n"
    "- سرویس سالانه پکیج\n"
    "- تعمیر و رفع خطا (همه برندها)\n"
    "- هواگیری و تنظیم فشار\n\n"
    "برای ثبت سفارش آنلاین: " + ORDER_URL
)
RECEIPT = "پیام شما ثبت شد؛ همکاران ما در اولین فرصت با شما تماس می‌گیرند.\n\n" + PHONES_TEXT


def call(method, payload, tries=2, timeout=25):
    """یک فراخوانی API روبیکا v3 با تلاش مجدد؛ خروجی (ok, data, description)."""
    last_desc = ""
    for _ in range(tries):
        req = urllib.request.Request(
            BASE + TOKEN + "/" + method,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                res = json.load(r)
                status = res.get("status", "")
                if status == "OK":
                    return True, (res.get("data") or {}), ""
                return False, res, str(res.get("dev_message") or status)
        except urllib.error.HTTPError as e:
            try:
                body = json.loads(e.read().decode())
                return False, body, str(body.get("dev_message") or body.get("status") or e.code)
            except Exception:
                last_desc = "HTTP " + str(e.code)
        except Exception as e:
            last_desc = str(e)
        time.sleep(2)
    return False, None, last_desc


def send(chat_id, text):
    ok, res, desc = call("sendMessage", {"chat_id": str(chat_id), "text": text})
    if not ok:
        print("  sendMessage failed:", desc)
    return ok


def extract(u):
    """استخراج (chat_id, message_id, text, ts) از ساختارهای احتمالی update روبیکا."""
    if not isinstance(u, dict):
        return None, None, "", None
    obj = u.get("data") if isinstance(u.get("data"), dict) else u
    msg = obj.get("new_message")
    if not isinstance(msg, dict):
        msg = obj.get("message")
    if not isinstance(msg, dict):
        msg = u.get("new_message")
    if not isinstance(msg, dict):
        msg = {}
    chat_id = obj.get("chat_id") or u.get("chat_id") or msg.get("chat_id") or ""
    msg_id = msg.get("message_id") or obj.get("message_id") or u.get("message_id") or ""
    text = msg.get("text") or obj.get("text") or ""
    if not text and isinstance(msg.get("aux"), dict):
        text = msg["aux"].get("text") or ""
    ts = None
    raw_t = msg.get("time") or obj.get("time") or u.get("time")
    try:
        ts = float(raw_t)
        if ts > 1e12:
            ts /= 1000.0
    except Exception:
        ts = None
    return str(chat_id), str(msg_id), str(text), ts


def main():
    if not TOKEN:
        print("RUBIKA_TOKEN secret is not set; skipping.")
        return
    if not OWNER:
        print("RUBIKA_CHAT_ID is not set; auto-replies work, forwarding disabled.")

    offset = ""
    try:
        with open(OFFSET_FILE) as f:
            offset = f.read().strip()
    except Exception:
        offset = ""

    payload = {"limit": 25}
    if offset:
        payload["offset_id"] = offset
    ok, data, desc = call("getUpdates", payload, tries=1)
    if not ok:
        print("getUpdates failed:", desc)
        return

    data = data or {}
    updates = data.get("updates") or []
    next_offset = str(data.get("next_offset_id") or "")
    print("updates:", len(updates), "| next_offset_id:", next_offset)
    if updates:
        print("raw first update:", json.dumps(updates[0], ensure_ascii=False)[:600])
    if next_offset:
        with open(OFFSET_FILE, "w") as f:
            f.write(next_offset)

    for u in updates:
        chat_id, msg_id, text, ts = extract(u)
        if not chat_id:
            continue
        if ts and time.time() - ts > MAX_AGE:
            print("  skip old message in chat", chat_id)
            continue
        t = text.strip()
        low = t.lower()
        print("  chat", chat_id, "|", repr(t[:60]))

        if low in ("", "/start", "/help", "سلام", "درود", "hi", "hello"):
            send(chat_id, WELCOME)
            continue
        if low in ("/phones", "/call"):
            send(chat_id, PHONES_TEXT)
            continue
        if low in ("/order", "/services"):
            send(chat_id, SERVICES_TEXT)
            continue
        if low == "/hours":
            send(chat_id, HOURS_TEXT)
            continue

        if OWNER and chat_id != OWNER:
            # مشتری: فوروارد به مالک + شماره تماس + رسید
            forwarded = False
            if msg_id:
                okf, resf, descf = call("forwardMessage", {
                    "from_chat_id": chat_id,
                    "message_id": msg_id,
                    "to_chat_id": OWNER})
                forwarded = okf
                if not okf:
                    print("  forward failed:", descf)
            if not forwarded:
                send(OWNER, "پیام از مشتری روبیکا (شناسه " + chat_id + "):\n" + t)
            mph = re.search(r"\b09\d{9}\b", t)
            if mph:
                send(OWNER, "شماره تماس مشتری: " + mph.group(0))
            send(chat_id, RECEIPT)
        else:
            send(chat_id, WELCOME)

    print("done")


if __name__ == "__main__":
    main()
