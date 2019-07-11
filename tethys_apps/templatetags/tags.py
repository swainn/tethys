from django import template
import re

register = template.Library()


@register.filter
def get_tags_from_apps(apps):
    tags_list = []

    if len(apps.get('configured', [])) > 5:
        for app in apps.get('configured'):
            tags = app.tags
            tags = [_f for _f in re.split("[,]+", tags) if _f]
            for tag in tags:
                tag = tag.replace('"', '')
                tag = tag.replace("'", '')
                tag = re.sub(r"\s+", '-', tag)
                tags_list.append(tag)
                tags_list = list(set(tags_list))

    return tags_list


@register.filter
def get_tag_class(app):
    get_tags = app.tags
    get_tags = [_f for _f in re.split("[,]+", get_tags) if _f]
    tags = []
    for tag in get_tags:
        tag = tag.replace('"', '')
        tag = tag.replace("'", '')
        tag = re.sub(r"\s+", '-', tag)
        tags.append(tag)

    tags_list = ' '.join(tags)

    return tags_list
