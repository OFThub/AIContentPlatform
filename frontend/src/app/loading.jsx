import Spinner from '../components/Spinner';

export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <Spinner />
    </div>
  );
}
