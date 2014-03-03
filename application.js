/** @jsx React.DOM */

LINE_HEIGHT = 18;

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

var WhatIAmDoingApp = React.createClass({

	getInitialState: function () {
		return {
			log: INITIAL_LOG
		};
	},

	componentWillMount: function () {
		this.process(this.state.log);
	},

	onChange: function (e) {
		var log = this.handleNowWords(e.target.value);
		this.setState({log: log});
		this.process(log);
	},

	handleNowWords: function (text) {
		var now = new Date;
		var nowStr = utils.padForWatch(now.getHours()) + ':' + utils.padForWatch(now.getMinutes());
		var re = new RegExp('\n(' + NOW_WORDS.join('|') + ') $');
		return ("\n" + text).replace(re, "\n" + nowStr + ' ').replace(/^\n/, '');
	},

	process: function (log) {
		var records = log.split("\n").map(function (line) {
			var matches;
			if (matches = line.match(/(\d\d):(\d\d)\s+([^:]*)(\s*:?\s*(.*))?/)) {
				return {
					minute: parseInt(matches[1], 10) * 60 + parseInt(matches[2], 10),
					category: matches[3],
					task: matches[5],
				};
			}
			else {
				return null;
			}
		});
		var categories = {};
		records.filter(function (r) {return r;}).reduce(function (record, nextRecord) {
			var duration = nextRecord.minute - record.minute;
			var category = categories[record.category] || (categories[record.category] = {time: 0});
			category.time += duration;
			if (record.task) {
				var tasks = category.tasks || (category.tasks = {});
				var task = tasks[record.task] || (tasks[record.task] = {time: 0});
				task.time += duration;
			}
			return nextRecord;
		});
		this.setState({
			records: records,
			categories: categories
		});
	},

	render: function() {
		var textareaHeight = LINE_HEIGHT * this.state.log.split("\n").length;
		var records = this.state.records.map(function (record) {
			return <div style={{'height': LINE_HEIGHT}}>{record ? '✔' : null}</div>;
		});
		var categories = Object.keys(this.state.categories).map(function (categoryName) {
			var category = this.state.categories[categoryName];
			var tasks = category.tasks && Object.keys(category.tasks).map(function (taskName) {
				return <li>{taskName}: {utils.watchTime(category.tasks[taskName].time)}</li>;
			});
			return <div>{categoryName}: {utils.watchTime(category.time)} <ul>{tasks}</ul></div>;
		}, this);
		return (
			<div className="container">
				<div className="records">{records}</div>
				<textarea style={{height: textareaHeight + 5, 'line-height': LINE_HEIGHT}} value={this.state.log} onChange={this.onChange} />
				<div className="categories">{categories}</div>
			</div>
		);
	}
});

React.renderComponent(<WhatIAmDoingApp/>, document.body);
