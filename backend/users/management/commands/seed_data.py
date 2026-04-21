"""Seed the database with a demo user, sample blog posts, and reading texts.

Usage
-----
    python manage.py seed_data

Re-running the command is idempotent: posts and texts are looked up by
``title`` and updated in place rather than duplicated.
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from posts.models import Post
from texts.models import Text

User = get_user_model()


SAMPLE_POSTS = [
    {
        "title": "Korean Particles 101: 은/는 vs 이/가",
        "tags": ["grammar", "particles", "beginner"],
        "body": (
            "<p>One of the first hurdles in Korean grammar is the difference "
            "between the <strong>topic marker</strong> 은/는 and the "
            "<strong>subject marker</strong> 이/가. They often translate to the "
            "same English word, but they convey very different nuances.</p>"
            "<h3>The topic marker: 은/는</h3>"
            "<p>Use 은/는 to introduce what the sentence is <em>about</em>. "
            "For example: 저는 학생입니다 (As for me, I am a student).</p>"
            "<h3>The subject marker: 이/가</h3>"
            "<p>Use 이/가 to identify <em>who or what</em> performs the action. "
            "For example: 고양이가 자요 (The cat is sleeping).</p>"
            "<p>Try this contrast: 날씨는 좋아요 focuses on the weather as a "
            "topic, while 날씨가 좋아요 simply states that the weather is nice.</p>"
        ),
    },
    {
        "title": "Polite Speech: The 합니다 and 해요 Forms",
        "tags": ["grammar", "politeness", "verbs"],
        "body": (
            "<p>Korean verbs are conjugated according to the level of politeness. "
            "Two of the most common polite endings you'll hear are "
            "<strong>-합니다</strong> (formal polite) and <strong>-해요</strong> "
            "(informal polite).</p>"
            "<h3>-합니다 form</h3>"
            "<p>Used in news broadcasts, business meetings and with strangers. "
            "Example: 감사합니다 (Thank you).</p>"
            "<h3>-해요 form</h3>"
            "<p>The everyday polite form used with coworkers, shop clerks and "
            "new acquaintances. Example: 안녕하세요 (Hello).</p>"
            "<p>Try saying 저는 한국어를 공부해요 out loud — it means "
            "“I study Korean.” The same sentence in the -합니다 form would be "
            "저는 한국어를 공부합니다.</p>"
        ),
    },
    {
        "title": "Counters in Korean: 개, 명, 마리",
        "tags": ["grammar", "counters", "beginner"],
        "body": (
            "<p>When counting things in Korean you usually need a "
            "<strong>counter word</strong>, similar to saying “three "
            "<em>sheets</em> of paper” in English. The counter depends on "
            "<em>what</em> you're counting.</p>"
            "<ul>"
            "<li>개 — the generic counter for objects. 사과 두 개 = two apples.</li>"
            "<li>명 — counter for people. 학생 세 명 = three students.</li>"
            "<li>마리 — counter for animals. 강아지 한 마리 = one puppy.</li>"
            "</ul>"
            "<p>Note that the native Korean numbers (하나, 둘, 셋…) drop their "
            "final ㄹ/ㅅ before a counter: 하나 → 한, 둘 → 두, 셋 → 세, 넷 → 네.</p>"
            "<p>Practice sentence: 책 다섯 권이 있어요 — “I have five books.”</p>"
        ),
    },
]


SAMPLE_TEXTS = [
    # ----------------------------------------------------------------- EASY
    {
        "title": "카페에서 (At the Café)",
        "level": "easy",
        "tags": ["dialogue", "daily-life", "beginner"],
        "body": (
            "<p>손님: 안녕하세요. 아메리카노 한 잔 주세요.</p>"
            "<p>직원: 네, 따뜻한 거로 드릴까요, 아이스로 드릴까요?</p>"
            "<p>손님: 아이스로 주세요. 얼마예요?</p>"
            "<p>직원: 사천오백 원입니다. 드시고 가세요?</p>"
            "<p>손님: 네, 여기에서 마실게요. 감사합니다.</p>"
        ),
    },
    {
        "title": "내 하루 (My Day)",
        "level": "easy",
        "tags": ["description", "daily-life", "beginner"],
        "body": (
            "<p>저는 아침에 일곱 시에 일어나요. 샤워를 하고 아침을 먹어요. "
            "보통 빵과 우유를 먹어요.</p>"
            "<p>아홉 시에 학교에 가요. 수업은 열두 시에 끝나요. "
            "점심은 친구들하고 같이 먹어요.</p>"
            "<p>오후에는 도서관에서 공부해요. 저녁에는 집에서 한국 드라마를 봐요. "
            "저는 한국 드라마를 정말 좋아해요.</p>"
        ),
    },
    # --------------------------------------------------------------- MIDDLE
    {
        "title": "서울의 대중교통 (Seoul Public Transit)",
        "level": "middle",
        "tags": ["news", "culture", "transport"],
        "body": (
            "<p>서울은 대중교통이 매우 발달한 도시입니다. 지하철은 24개의 "
            "노선이 있고, 하루에 수백만 명이 이용합니다. 버스도 구석구석 "
            "다니기 때문에 차가 없어도 불편함을 느끼기 어렵습니다.</p>"
            "<p>교통카드 한 장만 있으면 지하철과 버스를 자유롭게 갈아탈 수 "
            "있습니다. 특히 환승 할인이 적용되어 요금이 저렴해집니다. "
            "외국인 여행객도 편의점에서 쉽게 카드를 살 수 있습니다.</p>"
            "<p>최근에는 공공자전거 '따릉이'도 인기를 끌고 있습니다. "
            "짧은 거리를 이동할 때는 자전거가 가장 빠를 때도 많습니다.</p>"
        ),
    },
    {
        "title": "한국 음식 이야기 (Stories of Korean Food)",
        "level": "middle",
        "tags": ["culture", "food", "grammar"],
        "body": (
            "<p>한국 음식 하면 김치를 떠올리는 사람들이 많습니다. 그러나 "
            "한국에는 김치 말고도 수많은 전통 음식이 있습니다. 예를 들어, "
            "비빔밥은 여러 가지 나물과 고추장을 넣어 비벼 먹는 음식으로 "
            "건강에 좋은 한 끼 식사입니다.</p>"
            "<p>한편, 불고기는 외국인들이 가장 좋아하는 한국 음식 중 "
            "하나입니다. 소고기를 간장, 설탕, 마늘로 양념해서 구워 먹기 "
            "때문에 단짠 맛이 특징입니다.</p>"
            "<p>최근에는 한류의 영향으로 떡볶이나 치킨 같은 분식과 길거리 "
            "음식도 해외에서 큰 인기를 얻고 있습니다.</p>"
        ),
    },
    # -------------------------------------------------------------- ADVANCED
    {
        "title": "언어와 정체성 (Language and Identity)",
        "level": "advanced",
        "tags": ["essay", "linguistics", "advanced"],
        "body": (
            "<p>언어는 단순한 의사소통의 도구를 넘어, 한 사회가 세계를 "
            "바라보는 방식을 반영하는 거울이라고 할 수 있다. 한국어에 "
            "존재하는 복잡한 존댓말 체계는 위계와 관계를 중시해 온 한국 "
            "사회의 전통적 가치관이 언어 속에 굳어진 결과이다.</p>"
            "<p>최근 세계화와 디지털화가 진행되면서 젊은 세대는 영어식 "
            "표현이나 줄임말을 자유롭게 사용하고 있다. 이러한 변화는 "
            "언어의 자연스러운 진화로 볼 수도 있지만, 동시에 전통적인 "
            "언어 규범과 부딪히는 지점이 생기기도 한다.</p>"
            "<p>결국 언어는 고정된 것이 아니라 그것을 쓰는 사람들과 함께 "
            "끊임없이 변화하며, 그 변화를 관찰하는 일은 한 사회의 정체성을 "
            "이해하는 가장 섬세한 창이 될 수 있다.</p>"
        ),
    },
    {
        "title": "도시의 고독 (Urban Solitude)",
        "level": "advanced",
        "tags": ["literature", "essay", "advanced"],
        "body": (
            "<p>저녁이 깊어질수록 도시의 불빛은 더욱 선명해졌다. 창밖으로 "
            "보이는 수많은 창문 뒤에는 저마다의 이야기가 숨어 있을 "
            "것이다. 그러나 우리는 그 이야기들에 쉽게 다가가지 못한 채 "
            "각자의 창 안에서 하루를 마무리한다.</p>"
            "<p>지하철 안에서 사람들은 휴대폰 화면에 시선을 고정한 채 "
            "말 한마디 나누지 않는다. 몸은 가깝지만 마음의 거리는 오히려 "
            "도시가 아닌 어느 시골보다도 멀게 느껴질 때가 있다.</p>"
            "<p>그럼에도 불구하고 밤이 되면 어디선가 흘러나오는 음악 "
            "소리, 누군가의 웃음소리가 이 고독을 부드럽게 감싸 준다. "
            "도시의 고독은 완전한 단절이 아니라, 낯선 이들과 느슨하게 "
            "연결되어 있다는 감각인지도 모른다.</p>"
        ),
    },
]


class Command(BaseCommand):
    help = "Seed the database with a demo user, sample posts, and reading texts."

    def add_arguments(self, parser):
        parser.add_argument("--email", default="demo@korean-blog.dev")
        parser.add_argument("--password", default="demopass123")

    def handle(self, *args, **opts):
        email = opts["email"]
        password = opts["password"]

        author, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": "demo_author",
                "native_language": "English",
                "bio": "Demo author for the Korean Blog seed data.",
            },
        )
        if created:
            author.set_password(password)
            author.save()
            self.stdout.write(self.style.SUCCESS(f"Created demo user {email}"))
        else:
            self.stdout.write(f"Reusing existing demo user {email}")

        now = timezone.now()

        # ----- Blog posts -----
        for entry in SAMPLE_POSTS:
            post, was_created = Post.objects.update_or_create(
                title=entry["title"],
                defaults={
                    "body": entry["body"],
                    "author": author,
                    "published": True,
                    "published_at": now,
                },
            )
            post.tags.set(entry.get("tags", []))
            verb = "Created" if was_created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{verb} post: {post.title}"))

        # ----- Reading texts -----
        for entry in SAMPLE_TEXTS:
            text, was_created = Text.objects.update_or_create(
                title=entry["title"],
                defaults={
                    "body": entry["body"],
                    "level": entry["level"],
                    "author": author,
                },
            )
            text.tags.set(entry.get("tags", []))
            verb = "Created" if was_created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(
                    f"{verb} text [{entry['level']}]: {text.title}"
                )
            )

        self.stdout.write(self.style.SUCCESS("Seed data complete."))
