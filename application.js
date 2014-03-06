/** @jsx React.DOM */

LINE_HEIGHT = 18;

LOCAL_STORAGE_KEY = 'text';

NOW_WORDS = [
	'now', // english
	'teraz', // polish
	'тепер', 'зараз', // ukrainian
	'теперь', 'сейчас' // russian
];

INITIAL_LOG = [
	'10:00 working: task 1',
	'11:00 break',
	'11:20 working: task 1',
	'14:00 launch',
	'15:00 working: task 2',
	'17:00 break',
	'17:20 working: task 2',
	'19:00 going home!',
].join("\n");

ROOT_NODE_NAME = 'Total';
REST_NODE_NAME = '<unknown>';


var pad = function (symbol, length, str) {
	var result = '' + str;
	while (result.length < length) { result = symbol + result; }
	return result;
};

var utils = {
	pad: pad,
	padForWatch: pad.bind(null, '0', 2),
	watchTime: function (minutes) {
		return '' + Math.floor(minutes/60) + ':' + this.padForWatch(minutes % 60);
	}
};


function Node(name) {
	this.name = name;
	this.time = 0;
	this.children = {};
}

Node.prototype.add = function (time) {
	this.time += time;
};

Node.prototype.access = function (link) {
	return this.children[link] || (this.children[link] = new Node(link));
};

Node.prototype.getChildren = function () {
	return Object.keys(this.children).map(function (link) {return this.children[link];}, this);
};

Node.prototype.sumup = function () {
	this.getChildren().forEach(function (node) {node.sumup();});
	var sum = this.getChildren().reduce(function (res, node) {return res + node.time;}, 0);
	if (this.getChildren().length > 0 && this.time - sum > 0) {
		var restNode = this.access(REST_NODE_NAME);
		restNode.add(this.time - sum);
	}
};


var WhatIAmDoingApp = React.createClass({

	getInitialState: function () {
		return {
			log: localStorage.getItem(LOCAL_STORAGE_KEY) || INITIAL_LOG
		};
	},

	componentWillMount: function () {
		this.process(this.state.log);
	},

	storeLog: function (text) {
		localStorage.setItem(LOCAL_STORAGE_KEY, text);
	},

	onChange: function (e) {
		var log = this.handleNowWords(e.target.value);
		this.setState({log: log});
		this.storeLog(log);
		this.process(log);
	},

	handleNowWords: function (text) {
		var now = new Date;
		var nowStr = utils.padForWatch(now.getHours()) + ':' + utils.padForWatch(now.getMinutes());
		var re = new RegExp('\n(' + NOW_WORDS.join('|') + ') (\n*)$');
		return ("\n" + text).replace(re, "\n" + nowStr + ' ').replace(/^\n/, '');
	},

	process: function (log) {
		var lines = log.split("\n").map(function (line) {
			var matches, hours, minutes, rawPath, path;
			if (matches = line.match(/(\d\d):(\d\d)\s+(.+)/)) {
				hours = matches[1];
				minutes = matches[2];
				rawPath = matches[3];
				path = rawPath.split(/\s*:\s*/);
				return {
					minute: parseInt(hours, 10) * 60 + parseInt(minutes, 10),
					path: path
				};
			}
			else {
				return null;
			}
		});
		var records = lines.filter(function (r) {return r;});
		var rootNode = new Node(ROOT_NODE_NAME);
		records.length > 0 && records.reduce(function (record, nextRecord) {
			var duration = nextRecord.minute - record.minute;
			var currentNode = rootNode;
			currentNode.add(duration);
			record.path.forEach(function (link) {
				currentNode = currentNode.access(link);
				currentNode.add(duration);
			});
			return nextRecord;
		});
		rootNode.sumup();
		this.setState({
			lines: lines,
			rootNode: rootNode
		});
	},

	render: function() {
		var textareaHeight = LINE_HEIGHT * this.state.log.split("\n").length;
		var lines = this.state.lines.map(function (record) {
			return <div style={{'height': LINE_HEIGHT}}>{record ? '✔' : null}</div>;
		});
		function renderNode(level, node) {
			var children = node.getChildren().map(renderNode.bind(null, level+1));
			if (children.length > 0) {
				children = <ul className={"nodes level-"+level}>{children}</ul>;
			}
			else {
				children = null;
			}
			return (
				<li key={node.name}>
					<div>{node.name}: {utils.watchTime(node.time)}</div>
					{children}
				</li>
			);
		}
		var nodes = renderNode(1, this.state.rootNode);
		return (
			<div className="container">
				<div className="lines">{lines}</div>
				<textarea style={{height: textareaHeight + 5, 'line-height': LINE_HEIGHT}} value={this.state.log} onChange={this.onChange} />
				<ul className={"nodes level-root"}>{nodes}</ul>
			</div>
		);
	}
});

React.renderComponent(<WhatIAmDoingApp/>, document.body);
