import requests
from bs4 import BeautifulSoup
import urllib.parse
import time

BASE_URL = "https://deepwiki.com/lijiaxu2021/MagicWord/"
OUTPUT_FILE = "deepwiki_content.md"

visited = set()
content_buffer = []

def get_soup(url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return BeautifulSoup(response.content, 'html.parser')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def crawl(url):
    if url in visited:
        return
    visited.add(url)
    
    print(f"Crawling: {url}")
    soup = get_soup(url)
    if not soup:
        return

    # Extract main content (assuming generic article/main tag or body)
    # DeepWiki structure usually puts content in <main> or <article>
    main_content = soup.find('main') or soup.find('article') or soup.body
    
    if main_content:
        # Convert to simple markdown-like text
        text = main_content.get_text(separator='\n', strip=True)
        content_buffer.append(f"\n\n# Source: {url}\n\n{text}\n\n{'='*50}\n")
    
    # Find links
    for link in soup.find_all('a', href=True):
        href = link['href']
        full_url = urllib.parse.urljoin(url, href)
        
        # Only crawl links within the MagicWord wiki path
        if full_url.startswith(BASE_URL) and full_url not in visited:
            # Avoid anchors/fragments acting as new pages
            if '#' in full_url:
                base_without_anchor = full_url.split('#')[0]
                if base_without_anchor in visited:
                    continue
                full_url = base_without_anchor
            
            crawl(full_url)
            time.sleep(1) # Be nice

if __name__ == "__main__":
    crawl(BASE_URL)
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("".join(content_buffer))
    
    print(f"Done. Content saved to {OUTPUT_FILE}")
