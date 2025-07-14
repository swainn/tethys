from pyfiglet import Figlet
from tethys_portal import __version__


def add_version_parser(subparsers):
    # Setup list command
    version_parser = subparsers.add_parser(
        "version", help="Print the version of tethys_platform"
    )
    version_parser.add_argument(
        "-e",
        "--exciting",
        help="Print the version of Tethys Platform in a more exciting way.",
        action="store_true",
        dest="exciting",
    )
    version_parser.set_defaults(func=version_command, exciting=False)


def version_command(args):
    if args.exciting:
        f = Figlet(font="standard", width=300)
        print(f.renderText("Tethys Platform"))
        print(f.renderText(__version__))
    else:
        print(__version__)
