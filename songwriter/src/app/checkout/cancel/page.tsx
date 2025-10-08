import Link from 'next/link';
import { Button } from '../../../components/ui/button';

export default function CancelPage() {
  return (
    <div className="text-center py-10">
      <h1 className="text-2xl font-bold mb-4">Your checkout was canceled</h1>
      <p className="mb-6 text-gray-600">
        Your payment was not processed. If you need help, please contact our support team.
      </p>
      <Link href="/checkout">
        <Button>Return to Checkout</Button>
      </Link>
    </div>
  );
} 