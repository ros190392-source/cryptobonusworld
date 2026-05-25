# IndexNow Setup

IndexNow enables instant URL submission to Bing and Yandex when content is published or updated.

## Setup Steps

1. Generate a random key (UUID format recommended):
   e.g. `a1b2c3d4e5f6789012345678901234ab`

2. Create a file at `/public/{key}.txt` containing only the key value:
   ```
   a1b2c3d4e5f6789012345678901234ab
   ```
   This file will be served at `https://cryptobonusworld.com/{key}.txt`

3. Submit URLs via API:
   ```
   POST https://api.indexnow.org/indexnow
   Content-Type: application/json
   {
     "host": "cryptobonusworld.com",
     "key": "a1b2c3d4e5f6789012345678901234ab",
     "keyLocation": "https://cryptobonusworld.com/a1b2c3d4e5f6789012345678901234ab.txt",
     "urlList": [
       "https://cryptobonusworld.com/exchanges/bybit/",
       "https://cryptobonusworld.com/bonuses/"
     ]
   }
   ```

4. Set `INDEXNOW_KEY` in `.env` for any automated submission scripts.

## References
- https://www.indexnow.org/documentation
- https://www.bing.com/indexnow
