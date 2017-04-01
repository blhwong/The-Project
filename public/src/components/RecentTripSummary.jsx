//RECENT TRIP SUMMARY

import React from 'react';
import ReactDOM from 'react-dom';
import TripEntry from './TripEntry.jsx';
import Util from '../lib/util.js'
import { BrowserRouter as Router, Route, Link, Redirect} from 'react-router-dom';

class RecentTripSummary extends React.Component {
  constructor(props) {
    super(props);

  }

  showRecentTripReceipt(event) {
    // console.log(event.target.innerHTML);
    //need to pass in trip name and admin name
    // Util.retrieveTripInfo({adminName: this.props.username, tripName: event.target.innerHTML})
    // this.props.updateRecentTripSummary({ sumBill: Number('25.00') });

  }

  render() {
    // console.log('PROPS IN RECENT TRIPS', this.props);
    return(
      <div className='page-container'>
        <h1>Most Recent Trips</h1>
        <div className='trip-summary'>{this.props.data.recent.map((item,index) => {
          return (
            <div>
              <Link to="/receipt-summary"
                key={index}
                onClick={this.recent}
                >{item.name}
              </Link>
              <br></br>
            </div>
          )
        })}
        </div>
      </div>
    )
  }
}

export default RecentTripSummary;
