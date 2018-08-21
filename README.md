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

### Iterations

1. Get stats about iterations in a space (uses default space _Openshift_io_) in a tabular form
`osio-stats iterations`

2. Exploring what various columns mean
```
osio-stats iterations --help
usage: osio-stats iterations  [options]

Queries iterations in selected spaces and shows high level statistics
Available columns (select by providing [id] in --columns option):

[id]		  ID - ID of iteration
[pid]		  Parent ID - ID of iteration parent, if it exists
[name]		Name - Name of iteration
[total]		# Total WIs - Number of total workitems in iteration (including children and all workitem types)
[wis]		  # WIs - Number of workitems in iteration (direct items only and filtered by work item type)
[woSPs]		# WIs w/o SPs - Number of workitems in iteration without story points
[woACs]		# WIs w/o ACs - Number of workitems in iteration without acceptance criteria
[spCom]		SPs completed - Total story points completed in the iteration
[spTot]		SPs total - Total story points estimated in the iteration

Options:
  --space               Space (id) to work with  [default: OpenShift_io]
  --include-item-types  Filter any query by item type(s)  [array] [default: Include all item types]
  --tsv                 Print out query outcome in Tab Separated Value format  [default: false]
  --version             Show version number  [boolean]
  --columns             Columns  [array] [default: Include all columns: id, pid, name, total, wis, woSPs, woACs, spCom, spTot]
  --help                Show help  [boolean]
```
3. Filter items by particular type (focus on Stories here)
`osio-stats iterations --include-item-types Story`

4. Display only columns we are interested in
```
osio-stats iterations --include-item-types Story --columns name wis woSPs

  ┌──────────────┬───────┬───────────────┐
  │     Name           │ # WIs    │ # WIs w/o SPs       │
  ├──────────────┼───────┼───────────────┤
  │   Jonquil          │  18      │      12             │
  ├──────────────┼───────┼───────────────┤
  │   Knapweed         │   2      │       2             │
  ├──────────────┼───────┼───────────────┤
  ...
```

5. Output as tab separated values
```
osio-metrics git:(master) ✗ osio-stats iterations --include-item-types Story --columns name wis woSPs --tsv
"Name"	"# WIs"	"# WIs w/o SPs"
"Jonquil"	18	12
"Knapweed"	2	2
...
```

TIP: Use can pipe output to `pbcopy` command for output to appear in your clipboard

### Workitems

Experimental feature at this point

1. Get work items in the iteration
`osio-status work-items 'Sprint 152'`

2. Get work items of porticular type (_Story_) in the iteration
`osio-status work-items 'Sprint 152' --include-item-types Story`