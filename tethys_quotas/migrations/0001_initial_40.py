# Generated by Django 3.2.12 on 2022-08-12 17:19

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tethys_apps', '0001_initial_40'),
    ]

    operations = [
        migrations.CreateModel(
            name='ResourceQuota',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('codename', models.CharField(max_length=255, unique=True)),
                ('name', models.CharField(max_length=255)),
                ('description', models.CharField(blank=True, default='', max_length=2048)),
                ('default', models.FloatField()),
                ('units', models.CharField(max_length=100)),
                ('applies_to', models.TextField()),
                ('active', models.BooleanField(default=False)),
                ('impose_default', models.BooleanField(default=True)),
                ('help', models.TextField()),
                ('_handler', models.TextField()),
            ],
            options={
                'verbose_name': 'Resource Quota',
            },
        ),
        migrations.CreateModel(
            name='EntityQuota',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('value', models.IntegerField(blank=True, null=True)),
                ('resource_quota', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tethys_quotas.resourcequota')),
            ],
            options={
                'verbose_name': 'Entity Quota',
            },
        ),
        migrations.CreateModel(
            name='UserQuota',
            fields=[
                ('entityquota_ptr', models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True, primary_key=True, serialize=False, to='tethys_quotas.entityquota')),
                ('entity', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Quota',
            },
            bases=('tethys_quotas.entityquota',),
        ),
        migrations.CreateModel(
            name='TethysAppQuota',
            fields=[
                ('entityquota_ptr', models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True, primary_key=True, serialize=False, to='tethys_quotas.entityquota')),
                ('entity', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tethys_apps.tethysapp')),
            ],
            options={
                'verbose_name': 'Tethys App Quota',
            },
            bases=('tethys_quotas.entityquota',),
        ),
    ]
