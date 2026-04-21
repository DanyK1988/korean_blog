"""Backfill ``source_type`` on existing Word rows.

Any row created before the ``source_type`` field existed will have the
column defaulted to ``"manual"``. For rows that *also* carry a
``source_post_id`` that's misleading — they really came from a post. Fix
them up in a single UPDATE so older entries render correctly in the
Dictionary's "source" column.
"""
from django.db import migrations


def backfill(apps, schema_editor):
    Word = apps.get_model("words", "Word")
    Word.objects.filter(source_post__isnull=False, source_type="manual").update(
        source_type="post"
    )


def noop(apps, schema_editor):
    """Nothing to undo — leaving source_type intact on reverse is fine."""


class Migration(migrations.Migration):
    dependencies = [
        ("words", "0003_word_context_sentence_word_is_phrase_and_more"),
    ]

    operations = [migrations.RunPython(backfill, noop)]
