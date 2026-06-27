export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-16 w-28">
          <svg
            viewBox="0 0 140 56"
            className="h-full w-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              x1="0"
              y1="28"
              x2="140"
              y2="28"
              stroke="#E4E0D6"
              strokeWidth="2"
            />

            <path
              d="M0 28 H40 L52 8 L64 48 L76 20 L84 28 H140"
              stroke="#B55538"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset="1"
              className="animate-[trace_1.6s_ease-in-out_infinite]"
            />
          </svg>

          
        </div>

        {/* <div className="text-center">
          <h3 className="text-[15px] font-semibold text-[#1C3D3A]">
            Loading patients
          </h3>

          <p className="mt-0.5 text-[13px] text-[#1C3D3A99]">
            Pulling up the chart
          </p>
        </div> */}
      </div>
    </div>
  );
}