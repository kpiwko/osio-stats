# OSIO Stats

A tool to gather various statistics from OpenShift.io Planner

## Usage

Prerequities:
* Node.js 8 or newer

After cloning this repository, run following
```
npm install -g
osio-stats --help
```

## Examples

* `osio-stats iterations` - shows stats for all iterations in a space (default space is OpenShift_io)
* `osio-stats iteration --tsv | pbcopy -` - ditto but formats output as *tsv* and pastes into clipboard. Can be directly copied to Google Sheets
* `osio-stats iteration --include-item-types Story` - shows stats for all iterations in a space but considers only work items of particular type
* `osio-status work-items 'Sprint 152'` - shows work items in 'Sprint 152'
* `osio-status work-items 'Sprint 152' --include-item-types Story` - shows work items in 'Sprint 152' of type 'Story'