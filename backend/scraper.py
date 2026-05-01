"""News scraper: fetch Google News RSS and summarize with Gemini."""
import asyncio
from urllib.parse import quote
import httpx
from bs4 import BeautifulSoup
from database import get_db
from ai import summarize_with_gemini, classify_news_category
from datetime import datetime, timezone

async def process_single_item(item, raw_text):
    """Helper to run AI tasks for one news item in parallel."""
    try:
        # Run summary and classification at the same time for this specific item
        summary, category = await asyncio.gather(
            summarize_with_gemini(raw_text, 60),
            classify_news_category(raw_text),
        )
        
        link = item.find("link").get_text(strip=True) if item.find("link") else ""
        source_tag = item.find("source")
        source_text = source_tag.get_text(strip=True) if source_tag else "Google News"
        pub_text = item.find("pubDate").get_text(strip=True) if item.find("pubDate") else ""

        return {
            "summary": summary,
            "source": source_text,
            "url": link,
            "published": pub_text,
            "category": category,
        }
    except Exception as e:
        print(f"[Scraper] Error processing item: {e}")
        return None

async def refresh_news_for_district(district: str, state: str) -> list:
    """Fetch directly from Google News (no proxy) and process in parallel."""
    query = quote(f"{district} {state} election 2026 India")
    # Direct Google News RSS URL
    rss_url = f"https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(rss_url)
            resp.raise_for_status()
            contents = resp.text

        soup = BeautifulSoup(contents, "lxml-xml")
        items = soup.find_all("item")[:5]

        # Prepare parallel tasks for all 5 news items
        item_tasks = []
        for item in items:
            title = item.find("title").get_text(strip=True) if item.find("title") else ""
            desc = item.find("description").get_text(strip=True) if item.find("description") else ""
            raw = f"{title}. {desc}"
            item_tasks.append(process_single_item(item, raw))

        # Execute all AI tasks for all items at once
        results = await asyncio.gather(*item_tasks)
        
        # Filter out any items that failed
        summaries = [r for r in results if r is not None]

        # Cache in Firestore (using votemitra-db)
        db = get_db()
        doc_id = district.lower().replace(" ", "_")
        cache_ref = db.collection("news_cache").document(doc_id)
        cache_ref.set({
            "district": district,
            "state": state,
            "summaries": summaries,
            "cached_at": datetime.now(timezone.utc).isoformat(),
        })
        return summaries

    except Exception as e:
        print(f"[Scraper] Fatal Error for {district}: {e}")
        return []

async def refresh_all_districts():
    """Refresh news for every district stored in Firestore."""
    db = get_db()
    # stream() gets all users to find unique districts
    users_ref = db.collection("users").stream()
    seen_districts = set()
    
    for user_doc in users_ref:
        data = user_doc.to_dict()
        dist = data.get("district")
        st = data.get("state")
        if dist and dist not in seen_districts:
            seen_districts.add(dist)
            await refresh_news_for_district(dist, st)