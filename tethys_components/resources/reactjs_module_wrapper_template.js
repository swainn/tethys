{%- for package, components in components_by_package.items() %}
{% if components|length == 1 and components[0] in named_defaults -%}
import {{ components|join('') }} from "https://esm.sh/{{ package }}?deps={{ dependencies|join(',') }}&bundle_deps";
{% else -%}
import {{ '{' }}{{ components|join(', ') }}{{ '}' }} from "https://esm.sh/{{ package }}?deps={{ dependencies|join(',') }}&exports={{ components|join(',') }}&bundle_deps";
{% endif -%}
export {{ '{' }}{{ components|join(', ') }}{{ '}' }};
{%- endfor %}

{%- for style in style_deps %}
loadCSS("{{ style }}");
{%- endfor %}

function loadCSS(href) {  
    var head = document.getElementsByTagName('head')[0];

    if (document.querySelectorAll(`link[href="${href}"]`).length === 0) {
        // Creating link element 
        var style = document.createElement('link');
        style.id = href;
        style.href = href;
        style.type = 'text/css';
        style.rel = 'stylesheet';
        head.append(style);
    }
}

export default ({ children, ...props }) => {
    const [{ component }, setComponent] = React.useState({});
    React.useEffect(() => {
        import("https://esm.sh/{npm_package_name}?deps={dependencies}").then((module) => {
            // dynamically load the default export since we don't know if it's exported.
            setComponent({ component: module.default });
        });
    });
    return component
        ? React.createElement(component, props, ...(children || []))
        : null;
};

export function bind(node, config) {
    const root = ReactDOM.createRoot(node);
    return {
        create: (component, props, children) =>
            React.createElement(component, wrapEventHandlers(props), ...children),
        render: (element) => root.render(element),
        unmount: () => root.unmount()
    };
}

function wrapEventHandlers(props) {
    const newProps = Object.assign({}, props);
    for (const [key, value] of Object.entries(props)) {
        if (typeof value === "function") {
            newProps[key] = makeJsonSafeEventHandler(value);
        }
    }
    return newProps;
}

function stringifyToDepth(val, depth, replacer, space) {
    depth = isNaN(+depth) ? 1 : depth;
    function _build(key, val, depth, o, a) { // (JSON.stringify() has it's own rules, which we respect here by using it for property iteration)
        return !val || typeof val != 'object' ? val : (a=Array.isArray(val), JSON.stringify(val, function(k,v){ if (a || depth > 0) { if (replacer) v=replacer(k,v); if (!k) return (a=Array.isArray(v),val=v); !o && (o=a?[]:{}); o[k] = _build(k, v, a?depth:depth-1); } }), o||(a?[]:{}));
    }
    return JSON.stringify(_build('', val, depth), null, space);
}

function makeJsonSafeEventHandler(oldHandler) {
    // Since we can't really know what the event handlers get passed we have to check if
    // they are JSON serializable or not. We can allow normal synthetic events to pass
    // through since the original handler already knows how to serialize those for us.
    return function safeEventHandler() {

        var filteredArguments = [];
        Array.from(arguments).forEach(function (arg) {
            if (typeof arg === "object" && arg.nativeEvent) {
                // this is probably a standard React synthetic event
                filteredArguments.push(arg);
            } else {
                filteredArguments.push(JSON.parse(stringifyToDepth(arg, 3, (key, value) => {
                    if (key === '') return value;
                    try {
                        JSON.stringify(value);
                        return value;
                    } catch (err) {
                        return (typeof value === 'object') ? value : undefined;
                    }
                })))
            }
        });
        oldHandler(...Array.from(filteredArguments));
    };
}