<script>
  const one = async () => {
    await new Promise((f) => setTimeout(f, 500)); // artificial delay
    return 1;
  };

  const two = async () => {
    await new Promise((f) => setTimeout(f, 500)); // artificial delay
    return 2;
  };
</script>

<p>{await one()}</p>
<p>{await two()}</p>