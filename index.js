const { shell } = require('electron');
const { exec } = require('child_process');
const color = require('color');

exports.decorateConfig = (config) => {
    const colorForeground = color(config.foregroundColor || '#fff');
    const colorBackground = color(config.backgroundColor || '#000');
    const colors = {
        foreground: colorForeground.string(),
        background: colorBackground.lighten(0.3).string()
    };

    const configColors = Object.assign({
        black: '#000000',
        red: '#ff0000',
        green: '#33ff00',
        yellow: '#ffff00',
        blue: '#0066ff',
        magenta: '#cc00ff',
        cyan: '#00ffff',
        white: '#d0d0d0',
        lightBlack: '#808080',
        lightRed: '#ff0000',
        lightGreen: '#33ff00',
        lightYellow: '#ffff00',
        lightBlue: '#0066ff',
        lightMagenta: '#cc00ff',
        lightCyan: '#00ffff',
        lightWhite: '#ffffff'
    }, config.colors);

    const hyperStatusLine = Object.assign({
        footerTransparent: true,
        dirtyColor: configColors.lightYellow,
        aheadColor: configColors.blue
    }, config.hyperStatusLine);

    return Object.assign({}, config, {
        css: `
            ${config.css || ''}
            .terms_terms {
                margin-bottom: 30px;
            }
            .footer_footer {
                display: flex;
                justify-content: space-between;
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 100;
                font-size: 12px;
                height: 30px;
                background-color: ${colors.background};
                opacity: ${hyperStatusLine.footerTransparent ? '0.5' : '1'};
                cursor: default;
                -webkit-user-select: none;
                transition: opacity 250ms ease;
            }
            .footer_footer:hover {
                opacity: 1;
            }
            .footer_footer .footer_group {
                display: flex;
                color: ${colors.foreground};
                white-space: nowrap;
                margin: 0 14px;
            }
            .footer_footer .group_overflow {
                overflow: hidden;
            }
            .footer_footer .component_component {
                display: flex;
            }
            .footer_footer .component_item {
                position: relative;
                line-height: 30px;
                margin-left: 9px;
            }
            .footer_footer .component_item:first-of-type {
                margin-left: 0;
            }
            .footer_footer .item_number {
                font-size: 10.5px;
                font-weight: 500;
            }
            .notifications_view {
                bottom: 50px;
            }
        `
    });
};

let pid;
let cluster;

const setCluster = () => {
    if (process.platform != 'win32') {
        exec(`kubectx -c`, (err, stdout) => {
            cluster = stdout.trim()
        })
    }
}

exports.decorateHyper = (Hyper, { React }) => {
    return class extends React.PureComponent {
        constructor(props) {
            super(props);

            this.state = {
                cluster: ''
            }
        }

        render() {
            const { customChildren } = this.props
            const existingChildren = customChildren ? customChildren instanceof Array ? customChildren : [customChildren] : [];

            return (
                React.createElement(Hyper, Object.assign({}, this.props, {
                    customInnerChildren: existingChildren.concat(React.createElement('footer', { className: 'footer_footer' },
                        React.createElement('div', { className: 'footer_group group_overflow' },
                            React.createElement('div', { className: 'component_component component_cwd' },
                                React.createElement('div', { className: 'component_item item_icon item_cwd', title: this.state.cluster, hidden: !this.state.cluster }, this.state.cluster)
                            )
                        ),
                    ))
                }))
            );
        }

        componentDidMount() {
            this.interval = setInterval(() => {
                this.setState({
                    cluster: cluster,
                });
            }, 100);
        }

        componentWillUnmount() {
            clearInterval(this.interval);
        }
    };
};

exports.middleware = (store) => (next) => (action) => {
    const uids = store.getState().sessions.sessions;

    switch (action.type) {
        case 'SESSION_SET_XTERM_TITLE':
            pid = uids[action.uid].pid;
            break;

        case 'SESSION_ADD':
            pid = action.pid;
            setCluster();
            break;

        case 'SESSION_ADD_DATA':
            const { data } = action;
            const enterKey = data.indexOf('\n') > 0;

            if (enterKey) {
                setCluster();
            }
            break;

        case 'SESSION_SET_ACTIVE':
            pid = uids[action.uid].pid;
            setCluster();
            break;
    }

    next(action);
};
