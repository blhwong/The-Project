import React from 'react';
import { BrowserRouter as Router, Route, Link, Redirect} from 'react-router-dom';

class TripSummaryEntry extends React.Component {
  constructor(props) {
    super(props);
  }
      // <p onClick={this.props.setSummary}>{this.props.item.name}</p>
  handleOnClick() {
    // debugger;
    var summary = {
      sumBill: this.props.item.sumBill,
      sumTax: this.props.item.sumTax,
      sumTip: this.props.item.sumTip,
      members: this.props.item.members,
      tripName: this.props.item.name,
      items: this.props.item.items
    }
    this.props.setSummary(summary);
  }
  render() {
    return (
      <div>
        <Link to="/summary" onClick={this.handleOnClick.bind(this)} className='trip-summary'>{this.props.item.name}</Link>
      </div>
    );
  }
}

export default TripSummaryEntry