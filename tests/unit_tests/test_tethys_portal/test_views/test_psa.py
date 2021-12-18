import unittest
from unittest import mock

from django.http import HttpResponseBadRequest
from django.test import override_settings
from django.contrib.auth import REDIRECT_FIELD_NAME
from django.core.exceptions import ImproperlyConfigured
from social_core.backends.base import BaseAuth
from social_django.views import _do_login

from tethys_services.backends.multi_tenant_mixin import MultiTenantMixin
from tethys_portal.forms import SsoTenantForm
from .mock_decorator import mock_decorator

# Fixes the Cache-Control error in tests. Must appear before view imports.
mock.patch('django.views.decorators.cache.never_cache', lambda x: x).start()
mock.patch('social_django.utils.psa', side_effect=mock_decorator).start()

from tethys_portal.views.psa import tenant, auth, complete  # noqa: E402


class TethysPortalViewsAccountsTest(unittest.TestCase):

    def setUp(self):
        pass

    def tearDown(self):
        pass

    @mock.patch('tethys_portal.views.psa.do_auth')
    def test_auth_not_mtm(self, mock_do_auth):
        mock_backend = mock.MagicMock(spec=BaseAuth)  # Not a MultiTenantMixin
        mock_backend.name = 'other backend'
        mock_request = mock.MagicMock(method='GET', backend=mock_backend)  # GET request
        url_backend = 'foo'

        ret = auth(mock_request, url_backend)

        mock_do_auth.assert_called_with(mock_backend, redirect_name=REDIRECT_FIELD_NAME)
        self.assertEqual(mock_do_auth(), ret)

    @mock.patch('tethys_portal.views.psa.do_auth')
    def test_auth_is_mtm_multi_tenant_none(self, mock_do_auth):
        mock_backend = mock.MagicMock(spec=MultiTenantMixin)
        mock_backend.name = 'foo'
        mock_backend.setting = mock.MagicMock(return_value=None)  # MULTI_TENANT returns None
        mock_request = mock.MagicMock(method='GET', backend=mock_backend)  # GET request
        url_backend = 'foo'

        ret = auth(mock_request, url_backend)

        mock_do_auth.assert_called_with(mock_backend, redirect_name=REDIRECT_FIELD_NAME)
        self.assertEqual(mock_do_auth(), ret)

    @mock.patch('tethys_portal.views.psa.redirect')
    @mock.patch('tethys_portal.views.psa.do_auth')
    def test_auth_is_mtm_configured(self, mock_do_auth, mock_redirect):
        mock_backend = mock.MagicMock(spec=MultiTenantMixin)
        mock_backend.name = 'foo'
        mock_backend.setting = mock.MagicMock(return_value={'foo bar': {}})  # MULTI_TENANT returns settings
        mock_request = mock.MagicMock(method='GET', backend=mock_backend)  # GET request
        url_backend = 'foo'

        ret = auth(mock_request, url_backend)

        mock_redirect.assert_called_with('social:tenant', backend=url_backend)
        mock_do_auth.assert_not_called()
        self.assertEqual(mock_redirect(), ret)

    @mock.patch('tethys_portal.views.psa.do_complete')
    def test_complete_not_mtm(self, mock_do_complete):
        mock_backend = mock.MagicMock(spec=BaseAuth)  # Not a MultiTenantMixin
        mock_backend.name = 'other backend'
        mock_request = mock.MagicMock(method='GET', backend=mock_backend)  # GET request
        url_backend = 'foo'

        ret = complete(mock_request, url_backend)

        mock_do_complete.assert_called_with(
            mock_backend,
            _do_login,
            user=mock_request.user,
            redirect_name=REDIRECT_FIELD_NAME,
            request=mock_request,
        )
        self.assertEqual(mock_do_complete(), ret)

    @mock.patch('tethys_portal.views.psa.log')
    @mock.patch('tethys_portal.views.psa.redirect')
    @mock.patch('tethys_portal.views.psa.do_complete')
    def test_complete_is_mtm_no_saved_tenant(self, mock_do_complete, mock_redirect, mock_log):
        mock_backend = mock.MagicMock(
            spec=MultiTenantMixin,
            strategy=mock.MagicMock(
                session_get=mock.MagicMock(return_value=None)
            )
        )
        mock_backend.name = 'foo'
        mock_request = mock.MagicMock(method='GET', backend=mock_backend)  # GET request
        url_backend = 'foo'

        ret = complete(mock_request, url_backend)

        mock_log.error.assert_called_with('Session contains no value for "tenant".')
        mock_redirect.assert_called_with('accounts:login')
        mock_do_complete.assert_not_called()
        self.assertEqual(mock_redirect(), ret)

    @mock.patch('tethys_portal.views.psa.do_complete')
    def test_complete_is_mtm_tenant_valid(self, mock_do_complete):
        mock_backend = mock.MagicMock(
            spec=MultiTenantMixin,
            strategy=mock.MagicMock(
                session_get=mock.MagicMock(return_value='Foo')
            )
        )
        mock_backend.name = 'foo'
        mock_request = mock.MagicMock(method='GET', backend=mock_backend)  # GET request
        url_backend = 'foo'

        ret = complete(mock_request, url_backend)

        self.assertEqual(mock_backend.tenant, 'Foo')
        mock_do_complete.assert_called_with(
            mock_backend,
            _do_login,
            user=mock_request.user,
            redirect_name=REDIRECT_FIELD_NAME,
            request=mock_request,
        )
        self.assertEqual(mock_do_complete(), ret)

    @mock.patch('tethys_portal.views.psa.log')
    @mock.patch('tethys_portal.views.psa.redirect')
    @mock.patch('tethys_portal.views.psa.do_complete')
    def test_complete_is_mtm_improperly_configured(self, mock_do_complete, mock_redirect, mock_log):
        mock_backend = mock.MagicMock(
            spec=MultiTenantMixin,
            strategy=mock.MagicMock(
                session_get=mock.MagicMock(return_value='Foo')
            )
        )
        type(mock_backend).tenant = mock.PropertyMock(side_effect=ImproperlyConfigured('some error'))
        mock_backend.name = 'foo'
        mock_request = mock.MagicMock(method='GET', backend=mock_backend)  # GET request
        url_backend = 'foo'

        ret = complete(mock_request, url_backend)

        mock_log.error.assert_called_with('some error')
        mock_redirect.assert_called_with('accounts:login')
        mock_do_complete.assert_not_called()
        self.assertEqual(mock_redirect(), ret)

    @mock.patch('tethys_portal.views.psa.log')
    @mock.patch('tethys_portal.views.psa.redirect')
    @mock.patch('tethys_portal.views.psa.do_complete')
    def test_complete_is_mtm_value_error(self, mock_do_complete, mock_redirect, mock_log):
        mock_backend = mock.MagicMock(
            spec=MultiTenantMixin,
            strategy=mock.MagicMock(
                session_get=mock.MagicMock(return_value='Foo')
            )
        )
        type(mock_backend).tenant = mock.PropertyMock(side_effect=ValueError('some error'))
        mock_backend.name = 'foo'
        mock_request = mock.MagicMock(method='GET', backend=mock_backend)  # GET request
        url_backend = 'foo'

        ret = complete(mock_request, url_backend)

        mock_log.error.assert_called_with('some error')
        mock_redirect.assert_called_with('accounts:login')
        mock_do_complete.assert_not_called()
        self.assertEqual(mock_redirect(), ret)

    @override_settings(SSO_TENANT_ALIAS='foo bar')
    @mock.patch('tethys_portal.views.psa.log')
    @mock.patch('tethys_portal.views.psa.redirect')
    def test_tenant_get_backend_not_mtm(self, mock_redirect, mock_log):
        mock_backend = mock.MagicMock(spec=BaseAuth)  # Not a MultiTenantMixin
        mock_backend.name = 'other backend'
        mock_request = mock.MagicMock(method='GET', GET=dict(), backend=mock_backend)  # GET request
        url_backend = 'foo'

        ret = tenant(mock_request, backend=url_backend)

        mock_log.error.assert_called_with('Backend "other backend" does not support MULTI_TENANT features.')
        mock_redirect.assert_called_with('accounts:login')
        self.assertEqual(mock_redirect(), ret)

    @override_settings(SSO_TENANT_ALIAS='foo bar')
    @mock.patch('tethys_portal.views.psa.SsoTenantForm', spec=SsoTenantForm)
    @mock.patch('tethys_portal.views.psa.render')
    def test_tenant_get(self, mock_render, mock_tenant_form):
        mock_backend = mock.MagicMock(spec=MultiTenantMixin)
        mock_request = mock.MagicMock(method='GET', GET=dict(), backend=mock_backend)  # GET request
        url_backend = 'foo'

        ret = tenant(mock_request, backend=url_backend)

        mock_tenant_form.assert_called()

        mock_render.assert_called_with(
            mock_request,
            'tethys_portal/accounts/sso_tenant.html',
            {
                'form': mock_tenant_form(),
                'form_title': 'Foo Bar',
                'page_title': 'Foo Bar',
                'backend': url_backend
            }
        )
        self.assertEqual(mock_render(), ret)

    @override_settings(SSO_TENANT_ALIAS='foo bar')
    @mock.patch('tethys_portal.forms.SsoTenantForm', spec=SsoTenantForm)
    def test_tenant_view_post_no_submit(self, mock_tenant_form):
        mock_backend = mock.MagicMock(spec=MultiTenantMixin)
        mock_request = mock.MagicMock(method='POST', POST=dict(), backend=mock_backend)  # Empty POST dict
        url_backend = 'foo'

        ret = tenant(mock_request, url_backend)

        mock_tenant_form.assert_not_called()

        self.assertIsInstance(ret, HttpResponseBadRequest)

    @override_settings(SSO_TENANT_ALIAS='foo bar')
    @mock.patch('tethys_portal.views.psa.do_auth')
    @mock.patch('tethys_portal.views.psa.SsoTenantForm', spec=SsoTenantForm)
    def test_tenant_view_post_valid(self, mock_tenant_form, mock_do_auth):
        mock_tenant_form.is_valid = mock.MagicMock(return_value=True)
        mock_tenant_form().cleaned_data = {'tenant': 'GitHub'}
        mock_backend = mock.MagicMock(spec=MultiTenantMixin)
        post_params = {
            'sso-tenant-submit': 'submit',
            'tenant': 'GitHub',
            'remember': False
        }
        mock_request = mock.MagicMock(method='POST', POST=post_params, backend=mock_backend)  # valid POST request
        url_backend = 'foo'

        ret = tenant(mock_request, url_backend)

        # Make sure form is bound to POST data
        mock_tenant_form.assert_called_with(mock_request.POST)
        mock_tenant_form().is_valid.assert_called()
        mock_do_auth.assert_called_with(mock_backend, redirect_name=REDIRECT_FIELD_NAME)
        self.assertEqual('GitHub', mock_backend.tenant)
        self.assertEqual(mock_do_auth(), ret)

    @override_settings(SSO_TENANT_ALIAS='foo bar')
    @mock.patch('tethys_portal.views.psa.log')
    @mock.patch('tethys_portal.views.psa.redirect')
    @mock.patch('tethys_portal.views.psa.do_auth')
    @mock.patch('tethys_portal.views.psa.SsoTenantForm', spec=SsoTenantForm)
    def test_tenant_view_post_improperly_configured(self, mock_tenant_form, mock_do_auth, mock_redirect, mock_log):
        mock_tenant_form.is_valid = mock.MagicMock(return_value=True)
        mock_tenant_form().cleaned_data = {'tenant': 'GitHub'}
        mock_backend = mock.MagicMock(spec=MultiTenantMixin)
        type(mock_backend).tenant = mock.PropertyMock(side_effect=ImproperlyConfigured('some error message'))
        post_params = {
            'sso-tenant-submit': 'submit',
            'tenant': 'GitHub',
            'remember': False
        }
        mock_request = mock.MagicMock(method='POST', POST=post_params, backend=mock_backend)  # valid POST request
        url_backend = 'foo'

        ret = tenant(mock_request, url_backend)

        # Make sure form is bound to POST data
        mock_tenant_form.assert_called_with(mock_request.POST)
        mock_tenant_form().is_valid.assert_called()
        mock_do_auth.assert_not_called()
        mock_log.error.assert_called_with('some error message')
        mock_redirect.assert_called_with('accounts:login')
        self.assertEqual(mock_redirect(), ret)

    @override_settings(SSO_TENANT_ALIAS='Thingy')
    @mock.patch('tethys_portal.views.psa.render')
    @mock.patch('tethys_portal.views.psa.do_auth')
    @mock.patch('tethys_portal.views.psa.SsoTenantForm', spec=SsoTenantForm)
    def test_tenant_view_post_value_error(self, mock_tenant_form, mock_do_auth, mock_render):
        mock_tenant_form.is_valid = mock.MagicMock(return_value=True)
        mock_tenant_form().cleaned_data = {'tenant': 'GitHub'}
        mock_backend = mock.MagicMock(spec=MultiTenantMixin)
        type(mock_backend).tenant = mock.PropertyMock(side_effect=ValueError)
        post_params = {
            'sso-tenant-submit': 'submit',
            'tenant': 'GitHub',
            'remember': False
        }
        mock_request = mock.MagicMock(method='POST', POST=post_params, backend=mock_backend)  # valid POST request
        url_backend = 'foo'

        ret = tenant(mock_request, url_backend)

        # Make sure form is bound to POST data
        mock_tenant_form.assert_called_with(mock_request.POST)
        mock_tenant_form().is_valid.assert_called()
        mock_do_auth.assert_not_called()
        mock_tenant_form().add_error.assert_called_with('tenant', 'Invalid thingy provided.')
        mock_render.assert_called_with(
            mock_request,
            'tethys_portal/accounts/sso_tenant.html',
            {
                'form': mock_tenant_form(),
                'form_title': 'Thingy',
                'page_title': 'Thingy',
                'backend': url_backend
            }
        )
        self.assertEqual(mock_render(), ret)
