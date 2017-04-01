import React from 'react';
import ReactDOM from 'react-dom';
import TripEntry from './TripEntry.jsx';
import TripSummaryEntry from './TripSummaryEntry.jsx';
import { BrowserRouter as Router, Route, Link, Redirect} from 'react-router-dom';

class TripSummary extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    // const data = {
    //   sumBill: '88.00',
    //   sumTax: '',
    //   sumTip: 0,
    //   sumTotal: 95.92,
    //   members: ['Brandon', 'Kai'],
    //   tripName: 'testing',
    //   username: 'Brandon Wong',
    //   items: [[{amount: "42.00", members: ["Brandon Wong"], name: "Pasta"}]]
    // }

    return(
      <div className='page-container'>
        <h1>Most Recent Trips</h1>
        <div className='trip-summary'>{this.props.data.recent.map((item,index) =>
          <TripSummaryEntry key={index} setSummary={this.props.setSummary} item={item}/>)}
        </div>
      </div>
    )
  }
}

export default TripSummary;
