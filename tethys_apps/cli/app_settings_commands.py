from django.core.exceptions import ObjectDoesNotExist

from tethys_apps.cli.cli_colors import pretty_output, BOLD, FG_RED


def app_settings_list_command(args):
    from tethys_apps.models import (TethysApp, PersistentStoreConnectionSetting, PersistentStoreDatabaseSetting,
                                    SpatialDatasetServiceSetting)

    setting_type_dict = {
        PersistentStoreConnectionSetting: 'ps_connection',
        PersistentStoreDatabaseSetting: 'ps_database',
        SpatialDatasetServiceSetting: 'ds_spatial'
    }

    app_package = args.app
    try:
        app = TethysApp.objects.get(package=app_package)

        app_settings = []
        for setting in PersistentStoreConnectionSetting.objects.filter(tethys_app=app):
            app_settings.append(setting)
        for setting in PersistentStoreDatabaseSetting.objects.filter(tethys_app=app):
            app_settings.append(setting)
        for setting in SpatialDatasetServiceSetting.objects.filter(tethys_app=app):
            app_settings.append(setting)

        unlinked_settings = []
        linked_settings = []

        for setting in app_settings:
            if hasattr(setting, 'spatial_dataset_service') and setting.spatial_dataset_service \
                    or hasattr(setting, 'persistent_store_service') and setting.persistent_store_service:
                linked_settings.append(setting)
            else:
                unlinked_settings.append(setting)

        with pretty_output(BOLD) as p:
            p.write("\nUnlinked Settings:")

        if len(unlinked_settings) == 0:
            with pretty_output() as p:
                p.write('None')
        else:
            is_first_row = True
            for setting in unlinked_settings:
                if is_first_row:
                    with pretty_output(BOLD) as p:
                        p.write('{0: <10}{1: <40}{2: <15}'.format('ID', 'Name', 'Type'))
                    is_first_row = False
                with pretty_output() as p:
                    p.write('{0: <10}{1: <40}{2: <15}'.format(setting.pk, setting.name,
                                                              setting_type_dict[type(setting)]))

        with pretty_output(BOLD) as p:
            p.write("\nLinked Settings:")

        if len(linked_settings) == 0:
            with pretty_output() as p:
                p.write('None')
        else:
            is_first_row = True
            for setting in linked_settings:
                if is_first_row:
                    with pretty_output(BOLD) as p:
                        p.write('{0: <10}{1: <40}{2: <15}{3: <20}'.format('ID', 'Name', 'Type', 'Linked With'))
                    is_first_row = False
                service_name = setting.spatial_dataset_service.name if hasattr(setting, 'spatial_dataset_service') \
                    else setting.persistent_store_service.name
                print('{0: <10}{1: <40}{2: <15}{3: <20}'.format(setting.pk, setting.name,
                                                                setting_type_dict[type(setting)], service_name))
    except ObjectDoesNotExist:
        with pretty_output(FG_RED) as p:
            p.write('The app you specified ("{0}") does not exist. Command aborted.'.format(app_package))
    except Exception as e:
        with pretty_output(FG_RED) as p:
            p.write(e)
            p.write('Something went wrong. Please try again.')


def app_settings_create_ps_database_command(args):
    from tethys_apps.utilities import create_ps_database_setting
    app_package = args.app
    setting_name = args.name
    setting_description = args.description
    required = args.required
    initializer = args.initializer
    initialized = args.initialized
    spatial = args.spatial
    dynamic = args.dynamic

    success = create_ps_database_setting(app_package, setting_name, setting_description or '',
                                         required, initializer or '', initialized, spatial, dynamic)

    if not success:
        exit(1)

    exit(0)


def app_settings_remove_command(args):
    from tethys_apps.utilities import remove_ps_database_setting
    app_package = args.app
    setting_name = args.name
    force = args.force
    success = remove_ps_database_setting(app_package, setting_name, force)

    if not success:
        exit(1)

    exit(0)
