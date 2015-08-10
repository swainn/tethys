"""
********************************************************************************
* Name: developer.py
* Author: Nathan Swain
* Created On: 2014
* Copyright: (c) Brigham Young University 2014
* License: BSD 2-Clause
********************************************************************************
"""
from django.contrib.auth.decorators import user_passes_test
from django.shortcuts import render


def is_staff(user):
    return user.is_staff


@user_passes_test(is_staff)
def home(request):
    context = {}
    return render(request, 'tethys_portal/developer/home.html', context)