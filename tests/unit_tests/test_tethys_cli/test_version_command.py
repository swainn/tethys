import unittest
from unittest import mock

import tethys_cli.version_command as vc


class VersionCommandTests(unittest.TestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_add_version_parser(self):
        mock_subparsers = mock.MagicMock()

        vc.add_version_parser(mock_subparsers)

        mock_subparsers.add_parser.assert_called_with(
            "version", help="Print the version of tethys_platform"
        )
        mock_subparsers.add_parser().set_defaults.assert_called_with(
            func=vc.version_command, exciting=False
        )

    @mock.patch("tethys_cli.version_command.print")
    def test_version_command(self, mock_print):
        from tethys_portal import __version__

        mock_args = mock.MagicMock(exciting=False)
        vc.version_command(mock_args)
        mock_print.assert_called_with(__version__)

    @mock.patch("tethys_cli.version_command.Figlet")
    @mock.patch("tethys_cli.version_command.print")
    def test_version_command_exciting(self, mock_print, mock_Figlet):
        from tethys_portal import __version__

        mock_args = mock.MagicMock(exciting=True)
        vc.version_command(mock_args)
        mock_Figlet.assert_called_with(font="standard", width=300)
        mock_Figlet().renderText.assert_any_call("Tethys Platform")
        mock_Figlet().renderText.assert_any_call(__version__)
        mock_print.assert_called_with(mock_Figlet().renderText())
