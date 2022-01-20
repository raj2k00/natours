/*eslint-disable*/
const stripe = Stripe(
  "pk_test_51KJX6sSF174p80HBWVCQbK0LcKHl0dk4GtIMHuljCAPD8wXlbNUfanbfO4uYNnzcHxIqmPG6c3oBUwJFAtnVi1Ie00r3frzCU1"
);

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from API
    const session = await axios(
      `/api/v1/bookings/checkout/${tourId}`
    );
    // console.log(session);

    // 2) Create checkout form + chanre credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    // console.log(err);
    showAlert("error", err);
  }
};
