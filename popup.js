document.getElementById('scrape-button').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id !== chrome.tabs.TAB_ID_NONE) {
      console.log('Executing script in the current tab:', tab);
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrapeTimesheets,
        args: [false] // false indicates to download the file
      }, (results) => {
        if (chrome.runtime.lastError) {
          console.error('Script injection failed:', chrome.runtime.lastError.message);
        } else {
          console.log('Script injected successfully:', results);
        }
      });
    } else {
      console.error('No active tab found or tab ID is invalid.');
    }
  } catch (error) {
    console.error('Failed to query tabs:', error);
  }
});

document.getElementById('copy-button').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id !== chrome.tabs.TAB_ID_NONE) {
      console.log('Executing script in the current tab:', tab);
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrapeTimesheets,
        args: [true] // true indicates to copy to clipboard
      }, (results) => {
        if (chrome.runtime.lastError) {
          console.error('Script injection failed:', chrome.runtime.lastError.message);
        } else {
          console.log('Script injected successfully:', results);
          if (results[0].result) {
            navigator.clipboard.writeText(results[0].result).then(() => {
              console.log('Timesheet data copied to clipboard.');
              document.querySelector('p.success').style = 'display: block;';
            }).catch(err => {
              console.error('Could not copy text: ', err);
            });
          } else {
            console.log('No timesheet data to copy.');
          }
        }
      });
    } else {
      console.error('No active tab found or tab ID is invalid.');
    }
  } catch (error) {
    console.error('Failed to query tabs:', error);
  }
});

function scrapeTimesheets(copyToClipboard) {
  console.log('Scrape timesheets script started.');

  function HourStrToDecimal(hourStr) {
    // Round hours up to nearest 15 minutes
    if (hourStr === '') return '';
    const [hours, minutes] = hourStr.split(':');
    const decimalHours = parseInt(hours) + parseInt(minutes) / 60;
    const roundedHours = Math.ceil(decimalHours * 4) / 4;
    return roundedHours.toFixed(2);
  }

  const rows = document.querySelectorAll('.timesheet-row-component-with-project');
  if (!rows.length) {
    console.error('No timesheet rows found.');
    return;
  }

  const timesheet = Array.from(rows).map((row, i) => {
    const project = row.querySelector('[dropdownkeybutton]:first-child .ng-star-inserted:first-child')?.innerText || '';
    const task = row.querySelectorAll('[dropdownkeybutton]:first-child .ng-star-inserted')[2]?.innerText || '';
    const client = row.querySelector('[dropdownkeybutton]:first-child .ng-star-inserted:last-child')?.innerText || '';
    const hours = Array.from(row.querySelectorAll('.cl-timesheet-input-td')).map(td => td.querySelector('time-duration input')?.value || '');
    return { project, task, client, hours };
  });

  if (!timesheet.length) {
    alert('No timesheet data to copy.');
    return;
  }

  if (copyToClipboard) {
    return timesheet.map(row => {
      const hoursCells = row.hours.map(h => HourStrToDecimal(h)).join('\t');
      return `${row.project}\t\t\t${row.task}\t${hoursCells}`;
    }).join('\n');
  } else {
    let csvContent = "Project, , , Task, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday\n";
    timesheet.forEach(function(row) {
      const hoursCells = row.hours.map(h => HourStrToDecimal(h)).join(', ');
      const csvRow = `${row.project}, , , ${row.task}, ${hoursCells}`;
      csvContent += csvRow + "\n";
    });
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "my_data.csv");
    document.body.appendChild(link); // Required for FF
    link.click();
    console.log('Timesheet data downloaded as CSV.');
  }
}
